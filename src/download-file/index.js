import fsPromises from 'fs/promises';
import path from 'path';
import { URL } from 'url';
import downloadFile from './downloader.js';
import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Downloads data into the given target from the given URL.
 * Modifies the given job object in place with status and results.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the full URL to download from
 *   Second input is the absolute path, including filename and suffic, to store the download to
 *   (optional) Third input is the username for basic auth
 *   (optional) Fourth input is the password for basic auth
 */
const callbackWorker = async (workerJob, inputs) => {
    const uri = inputs[0];
    const downloadPath = inputs[1];
    const username = inputs[2];
    const password = inputs[3];
    const url = new URL(uri);

    log('Downloading ' + url.href + ' …');

    // if provided: add basic auth credentials to request option
    const options = {};
    if (username && password) {
        options.auth = `${username}:${password}`
    }

    const downloadDir = path.dirname(downloadPath);
    await fsPromises.mkdir(downloadDir, { recursive: true });

    return downloadFile(url, downloadPath, options)
        .then((downloadPath) => {
            log('The download has finished.');
            workerJob.status = 'success';
            workerJob.outputs = [downloadPath];
        });

};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callbackWorker);
    } catch (e) {
        log('Problem when initializing:', e);
    }
})();

export default callbackWorker;
