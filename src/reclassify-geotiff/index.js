import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import fs from 'fs';
import path from 'path';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
import reclassifyGeoTiff from './reclassifier.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const reclassifyWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const inputFile = inputs[1];
    const levels = inputs[2];
    const outputPath = inputs[3];
    const region = inputs[4];

    // output File 
    const outputFileName = `${inputFile.replace(/\.[^/.]+$/, "")}_reclassified.tif`
    const tmpOutputFileName = `${inputFile.replace(/\.[^/.]+$/, "")}_tmp_reclassified.tif`

    // ensure directory exists
    const parentDirectory = path.dirname(outputPath);
    fs.mkdirSync(parentDirectory, { recursive: true });

    // output Path
    const splitPath = outputPath.split('/')
    splitPath.pop();
    splitPath.pop(); 
    const outputDir = `${splitPath.join('/')}/${region}_reclassified/`;
    const outputFile = outputDir + outputFileName;
    const tmpOutputFile = outputDir + tmpOutputFileName;


    logger.info(`Start converting to COG: ${inputPath}`);

    // check if target file already exists
    const outFileExists = await fs.existsSync(outputFile);
    if (outFileExists) {
        logger.info('Target file already exists. It will be overwritten.')
    }

    // ensure target directory exists
    fs.mkdirSync(outputDir, {
        recursive: true
    });

    const cliOut = await reclassifyGeoTiff(inputPath, outputFile, tmpOutputFile, levels);

    // delete temporary file
    fs.rmSync(tmpOutputFile);

    workerJob.status = 'success';
    workerJob.outputs = [outputPath];

    logger.info(`Reclassification Finshed. Stored GeoTiff to: ${outputFile}`);
    logger.debug({ cliOutput: cliOut, outputPath: outputFile });

    workerJob.status = 'success';

    logger.info(`Reclassification finished.`);
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, reclassifyWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();
export default reclassifyWorker;
