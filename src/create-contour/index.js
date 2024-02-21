import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import { getClient } from './get-client.js';
import { addData } from './add-to-table.js'
import fs from 'fs';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
import createContourLines from './contour.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;


const contourLinesWorker = async (workerJob, inputs) => {
    // todo put these information into converter.ts
    const inputPath = inputs[0];
    const interval = inputs[2];

    // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
    const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
    const matches = inputs[1].match(regex);
    const region = matches[1];
    // timestamp in filename is in UTC time, round to last hour
    const datasetTimestampUnformated = matches[2]
    const datasetTimestamp = dayjs.utc(datasetTimestampUnformated, 'YYYYMMDDTHHmmZ').startOf('hour');
    if (!datasetTimestamp.isValid()) {
        // timestamp of dataset not valid
        logger.error('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }

    // Might be needed if time range needs to be adjusted
    // get timestamp for current hour
    //const currentTimestamp = dayjs.utc().startOf('hour');

    await createContourLines(inputPath, datasetTimestampUnformated, interval);

    // Create table
    // TODO check if this can be moved to seperate file
    let client;
    try {
        (async () => {
            client = await getClient();
            let createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${region}_contourLines(
      id BIGSERIAL PRIMARY KEY NOT NULL ,
      timestamp timestamp without timezone,
      geom geometry,
      temp number,
    );
  `;
            await client.query(createTableQuery);
            logger.info(`Created table.`);
        })();
    } catch (e) {
        logger.error(e);
        throw 'SQL execution aborted: ' + e;
    } finally {
        if (client) {
            await client.end();
        }
    }

    // Add rows to table
    // array aus multiLines als geoJSON
    const file = `/tmp/output${datasetTimestampUnformated}.geojson`;
    const contourLines = fs.readFileSync(file, { encoding: 'utf-8' });
    const contourLinesJson = JSON.parse(contourLines);

    contourLinesJson.features.forEach(contourLine => addData(
        datasetTimestamp,
        contourLine,
        region
    ));

    workerJob.status = 'success';

    logger.info(`Created contour lines finished.`);
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, contourLinesWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();
export default contourLinesWorker;
