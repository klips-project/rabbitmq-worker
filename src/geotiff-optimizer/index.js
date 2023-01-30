import fs from 'fs';
import path from 'path';
import { initialize } from '../workerTemplate.js';
import optimizeGeoTiff from './optimize-geotiff.js';
import logger from './child-logger.js';


const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Optimizes a GeoTIFF for the cloud by converting it to a COG.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for the process
 *   First input is the path of the GeoTIFF to convert
 *   Second input is the path where the output COG shall be stored
 *
 * On success it assigns the output path to the results array
 */
const callbackWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const outputPath = inputs[1];

    // ensure directory exists
    const parentDirectory = path.dirname(outputPath);
    fs.mkdirSync(parentDirectory, { recursive: true });

    logger.debug(`Start converting to COG: ${inputPath}`)

    // ensure target directory exists
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, {
        recursive: true
    });

    const cliOut = await optimizeGeoTiff(inputPath, outputPath);
    logger.debug(cliOut);
    logger.debug(`Conversion Finshed. Stored COG to: ${outputPath}`)

    // delete original file
    fs.rmSync(inputPath);

    workerJob.status = 'success';
    workerJob.outputs = [outputPath];
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callbackWorker);
    } catch (e) {
        logger.error(`Problem when initializing: ${e}`);
    }
})();

export default callbackWorker;
