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

const callbackWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const outputPath = inputs[0];
    const finalDatadir = inputs[1];
    const inputFilename = path.basename(inputPath);
    // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
    const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
    const matches = inputFilename.match(regex);
    const region = matches[1];
    // timestamp in filename is in UTC time, round to last hour
    const datasetTimestamp = dayjs.utc(matches[2], 'YYYYMMDDTHHmmZ').startOf('hour');

    if (!datasetTimestamp.isValid()) {
        // timestamp of dataset not valid
        logger.error('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }

    // get timestamp for current hour
    const currentTimestamp = dayjs.utc().startOf('hour');

    // check if incomimg dataset timestamp === current timestamp
    if (datasetTimestamp.isSame(currentTimestamp)) {
        // dataset will become the new index 0
        // delete previous dataset -48
        const timestampToDelete = datasetTimestamp.subtract(49, 'hours');
        const fileToDelete = `${region}_${timestampToDelete.format('YYYYMMDDTHHmm')}Z.tif`

        await fs.rm(`${finalDatadir}/${region}/${region}_temperature/${fileToDelete}`);
    }

    workerJob.status = 'success';
    workerJob.outputs = [outputPath];

    logger.info(`Dataset rotation finished.`);
    logger.debug({ outputPath: outputPath });
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callbackWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();

export default callbackWorker;
