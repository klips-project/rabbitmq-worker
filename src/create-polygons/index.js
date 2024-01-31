import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import path from 'path';
import * as fs from 'fs/promises';

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
