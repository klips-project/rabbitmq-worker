import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import { getClient } from './get-client.js';
import { addData } from './add-to-table.js'
import fetch from 'node-fetch';

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
    const fileName = inputs[1];
    const interval = inputs[2];

    await createContourLines(inputPath, fileName, interval);

    // array aus multiLines als geoJSON
    // todo check if it needs a relative path
    const contourLines = fetch("/tmp/output.geojson")
        .then((response) => response.json())
        .then(data => { return (data) })


    // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
    const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
    const matches = inputs[1].match(regex);
    const region = matches[1];
    // timestamp in filename is in UTC time, round to last hour
    const datasetTimestamp = dayjs.utc(matches[2], 'YYYYMMDDTHHmmZ').startOf('hour');
    if (!datasetTimestamp.isValid()) {
        // timestamp of dataset not valid
        logger.error('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }

    // Might be needed if time range needs to be adjusted
    // get timestamp for current hour
    //const currentTimestamp = dayjs.utc().startOf('hour');

    if (datasetTimestamp) {
        // timestamp of dataset not valid
        logger.info('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }

    // Create table
    // TODO check if this can be moved to seperate file
    (async () => {
        const client = await getClient();
        let createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${region}_contourLines(
      id BIGSERIAL PRIMARY KEY NOT NULL ,
      timestamp timestamp without timezone,
      geom geometry,
      temp number,
    );
  `;
        const res = await client.query(createTableQuery);
        logger.info(`Created table.`);
        logger.info(res.rows[0].connected);
        await client.end();
    })();


    // Add rows to table
    contourLines.features.forEach(contourLine => addData(
        datasetTimestamp,
        contourLine,
        region
    ));

    workerJob.status = 'success';

    logger.info(`Archiving finished.`);
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
