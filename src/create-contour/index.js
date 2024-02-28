import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import { getClient } from './get-client.js';
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

    const file = `/tmp/output${datasetTimestampUnformated}.geojson`;
    const contourLines = fs.readFileSync(file, { encoding: 'utf-8' });
    const contourLinesJson = JSON.parse(contourLines);
    
    let client;
    try {
        // connect to database
        client = await getClient();
        let createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${region}_contourLines(
      id BIGSERIAL PRIMARY KEY NOT NULL ,
      timestamp timestamp,
      geom geometry,
      temperature numeric
    );
  `;
        await client.query(createTableQuery);
        logger.info(`Created table.`);

        // adds rows to table
        for (let index = 0; index < contourLinesJson.features.length; index++) {
            const contourLine = contourLinesJson.features[index];

            if (!('geometry' in contourLine)) {
                // timestamp of dataset not valid
                logger.error('Object is missing geometry');
                throw 'Object is missing geometry.';
            }

            if (!('properties' in contourLine)) {
                // timestamp of dataset not valid
                logger.error('Object is missing properties');
                throw 'Object is missing properties.';
            }

            const timestamp = datasetTimestamp.format('YYYY-MM-DD HH:mm:ss');
            const geom = JSON.stringify(contourLine.geometry);
            const temp = contourLine.properties.TEMP;

            // delete old rows with redundant timestamp
            let deleteRows = await client.query(`DELETE FROM ${region}_contourLines WHERE timestamp = '${timestamp}';`);
            logger.info(`Deleted ${deleteRows.rowCount} row`);

            // add new rows to table
            let insertRow = await client.query(`INSERT INTO ${region}_contourLines(timestamp, geom, temperature) VALUES('${timestamp}', ST_GeomFromGeoJSON('${geom}'), ${temp});`);
            logger.info(`Inserted ${insertRow.rowCount} row`);
        }
    } catch (e) {
        logger.error('SQL execution aborted:' + e);
    } finally {
        if (client) {
            await client.end();
        }
    }

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
