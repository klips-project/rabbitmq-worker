// import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import { getClient } from './get-client.js';
import { addData } from './add-to-table.js'
import fetch from 'node-fetch';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const fetchPolygons = async (fileUrlOnWebspace) => {
    const body = {
        inputs: {
            cogURL: fileUrlOnWebspace,
            interval: 1,
            bands: [1, 2, 3]
        }
    };
    const url = 'https://klips-dev.terrestris.de/processes/contour-polygons/execution';
    const response = await fetch(url, {
        body: JSON.stringify(body),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });


    if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status}`);
    }

    return await response.json();
};

const polygonsWorker = async (workerJob, inputs) => {
    // array aus multipolygonen (geoJSON?)
    const polygons = await fetchPolygons(inputs[0]);

    console.log(polygons)
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

    // if (datasetTimestamp ) {
    //     // timestamp of dataset not valid
    //     logger.info('Could not parse dataset timestamp.');
    //     throw 'Could not parse dataset timestamp.';
    // }

    // Create table
    // TODO check if this can be moved to seperate file
    (async () => {
        const client = await getClient();
        let createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${region}_polygons(
      id BIGSERIAL PRIMARY KEY NOT NULL ,
      timestamp timestamp without timezone,
      geom geometry,
      temp number,
      band int,
    );
  `;
        const res = await client.query(createTableQuery);
        logger.info(`Created table.`);
        logger.info(res.rows[0].connected);
        await client.end();
    })();


    // Add rows to table
    polygons.forEach(polygon => addData(
        datasetTimestamp,
        polygon,
        region
    ));

    workerJob.status = 'success';

    logger.info(`Archiving finished.`);
};

(async () => {
    // try {
        // Initialize and start the worker process
        // todo: here is an input missing
        // await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, polygonsWorker);
        await polygonsWorker({}, ['https://klips-dev.terrestris.de/cog/langenfeld/langenfeld_temperature/langenfeld_20240204T1000Z.tif', 'langenfeld_20240204T1000Z.tif']);

    // } catch (error) {
    //     logger.error({ error: error }, `Problem when initializing`);
    // }
})();
export default polygonsWorker;
