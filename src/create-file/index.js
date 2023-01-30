import fsPromises from 'fs/promises';
import path from 'path';
import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Creates a file at the given destination path and with the given content.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input {String|Buffer|TypedArray|DataView} is the content of the file to be written
 *   Second input {String} is the absolute path to store the content to. If filename and suffix
 *     are ommited, they will be generated (file.txt). Full path is returned as output argument.
 */
const callbackWorker = async (workerJob, inputs) => {
    const content = inputs[0];
    const destinationFileName = inputs[1];
    const hasSuffix = path.extname(destinationFileName).length > 1;
    let finalDestinationFileName = destinationFileName;

    if (!content) {
        throw "No content given to create-file worker";
    }

    if (!destinationFileName) {
        throw "No destination file path given to create-file worker";
    }

    if (!hasSuffix) {
        try {
            // just check if the path exists, will throw if not
            await fsPromises.opendir(finalDestinationFileName);
            finalDestinationFileName = path.join(destinationFileName, "file.txt")
        } catch (err) {
            throw "Could not open folder " + finalDestinationFileName;
        }
    }

    logger.debug('Creating file ' + finalDestinationFileName + ' …');
    await fsPromises.writeFile(finalDestinationFileName, content);

    logger.debug('File created successfully.');
    workerJob.status = 'success';
    workerJob.outputs = [finalDestinationFileName];
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callbackWorker);
    } catch (e) {
        logger.error('Problem when initializing: ' + e);
    }
})();

export default callbackWorker;
