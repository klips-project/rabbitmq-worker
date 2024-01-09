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

const archiveWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const finalDatadir = inputs[1];
    const dirToArchive = `${finalDatadir}/archive`;
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

    const copyToArchiveDir = async () => {
        // check if incomimg dataset timestamp === current timestamp and create file name to archive
        if (datasetTimestamp.isSame(currentTimestamp)) {
            const fileToArchive = `${region}_${datasetTimestamp.format('YYYYMMDDTHHmm')}Z.tif`;
            // create directory to archive to
            let canAccess;
            try {
                await fs.access(dirToArchive);
                canAccess = true;
            } catch (error) {
                logger.warn('Error');
                canAccess = false;
            }
            if (!canAccess) {
                await fs.mkdir(dirToArchive);
                logger.info(`New archive directory created`);
            }
            await fs.copyFile(
                `${finalDatadir}/${region}/${region}_temperature/${fileToArchive}`,
                `${dirToArchive}/${fileToArchive}`
            );
        }
        // delete older COGs
        const files = fs.readdirSync(`${finalDatadir}/${region}/${region}_temperature/`);
        const timestamps = files.forEach((element) => dayjs.utc(element.match(regex)[2], 'YYYYMMDDTHHmmZ').startOf('hour'));
        const timestampsToDelete = timestamps.filter(timestamp => timestamp < currentTimestamp.subtract(49, 'hours'));
        const filesToDelete = timestampsToDelete.forEach((timestamp) => `${finalDatadir}/${region}/${region}_temperature/${region}_${timestamp.format('YYYYMMDDTHHmm')}Z.tif`);

        try {
            filesToDelete.forEach(function (filepath) {
                fs.unlink(filepath);
            });
            logger.info(`Older files removed: ${timestampsToDelete}.`)
        } catch (err) {
            logger.warn('No files removed.')
        }

    };
    try {
        await copyToArchiveDir();
    } catch (error) {
        logger.error(`Could not copy dataset with timestamp: ${datasetTimestamp}.`);
    }

    workerJob.status = 'success';

    logger.info(`Archiving finished.`);
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, archiveWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();
export default archiveWorker;
