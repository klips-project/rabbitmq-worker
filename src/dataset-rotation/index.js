import path from 'path';
import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);
import * as fs from 'fs/promises';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const callbackWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const outputPath = inputs[1];
    const finalDatadir = '/opt/cog_data/';
    const inputFilename = path.basename(inputPath);
    // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
    const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
    const matches = inputFilename.match(regex);
    const region = matches[1];
    const datasetTimestamp = dayjs(matches[2], 'YYYYMMDDTHHmmZ').startOf('hour');

    if (!datasetTimestamp.isValid()) {
        // timestamp of dataset not valid
        logger.error('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }

    // get timestamp for current hour
    const currentTimestamp = dayjs().startOf('hour');

    // check if incomimg dataset is of current timestamp
    if (datasetTimestamp.isSame(currentTimestamp)) {
        // dataset will become the new index 0
        // step 1 move new dataset 0 to archive
        // TODO move to projetct partner archive as soon as this is available
        const archiveDir = '/opt/cog_data_archive';
        const archiveExists = fs.access(archiveDir);
        if (!archiveExists) {
            logger.error('Could not access dataset archive.');
            throw 'Could not access dataset archive.';
        }
        await fs.rename(inputPath, `${archiveDir}/${inputPath}`);
        // step 2 delete previous dataset -48
        const timestampToDelete = datasetTimestamp.subtract(49, 'hours');

        fs.rm(`${finalDatadir}_${region}_${timestampToDelete.format('YYYY')}`);
    }

    // move dataset from staging to final directory

    // check if target file already exists
    const outPathExists = await fs.access(outputPath);
    if (outPathExists) {
        logger.info('Target file already exists. It will be overwritten.')
    }

    // delete original file
    fs.rm(inputPath);

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
