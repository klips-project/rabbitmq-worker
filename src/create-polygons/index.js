import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import { getClient } from './get-client';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const fetchPolygons = async (fileUrlOnWebspace) => {
    const body = {
        inputs: {
            cogUrl: fileUrlOnWebspace[0],
            interval: 1,
            bands: [1, 2, 3]
        }
    };
    const url = 'https://klips-dev.terrestris.de/processes/contour_polygons/execution';
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
    const polygons = await fetchPolygons(inputs);

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
        console.log(`Created table.`);
        console.log(res.rows[0].connected);
        await client.end();
    })();
// TODO Loop through polygons and get geometry and temp of each element. Then add a new row for each element to the table
    //TODO get geometry, temp and band from polygons
    // TODO transform geom (geojson) to geometry
    
    // Add data to table
    (async () => {
        const client = await getClient();
        // TODO process.argv can potentially be removed
        const timestamp = process.argv[2] ?? datasetTimestamp;
        const geom = process.argv[2] ?? geometry;
        const temp = process.argv[2] ?? temperature;
        const band = process.argv[2] ?? band;
        let insertRow = await client.query(`INSERT INTO ${region}_polygons(timestamp, geom, temp, band) VALUES($1);`, [timestamp, geom, temp, band]);
        console.log(`Inserted ${insertRow.rowCount} row`);
        await client.end();
    })();



    workerJob.status = 'success';

    logger.info(`Archiving finished.`);
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, polygonsWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();
export default polygonsWorker;
