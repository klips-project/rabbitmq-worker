import http from 'http';
import https from 'https';
import fs from 'fs';
import logger from './child-logger.js';
import path from 'path';
import { URL } from 'url';

/**
 * Downloads a file from the internet to the local filesystem.
 *
 * @param {URL} url The url to download, starting with either 'http' or 'https'
 * @param {String} downloadPath The path on the system to download the file to (must exist)
 * @param {Object} [options={}] HTTP options as describe here https://nodejs.org/api/http.html#httprequestoptions-callback
 *
 * @returns {Promise} A Promise returning the path of the downloaded file on success
 */
const downloadFile = async (url, downloadPath, options = {}) => {

    // choose correct library depending on protocol
    let protocol;
    if (url.protocol === 'http:') {
        protocol = http;
    } else if (url.protocol === 'https:') {
        protocol = https;
    } else {
        throw `Url does not start with 'http' or 'https'`
    }

    return new Promise((resolve, reject) => {
        protocol.get(url.href,
            options,
            response => {
                if (response.statusCode === 200) {
                    logger.debug('URL responds with 200');

                    const fileWriter = fs
                        .createWriteStream(downloadPath)
                        .on('finish', () => {
                            logger.debug('Download finished');
                            resolve(downloadPath);
                        })
                        .on('error', (error) => {
                            logger.error({ error: error }, 'Download failed.')
                            return reject(new Error(error))
                        });
                    response.pipe(fileWriter)
                } else {
                    logger.error({ statusMessage: response.statusMessage, statusCode: response.statusCode }, 'URL returned invalid HTTP code.');
                    return reject(new Error(response.statusMessage))
                }
            })
            .on('error', (error) => {
                logger.error({ error: error }, 'Download failed.')
                return reject(error);
            });
    })
}

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

    logger.info(`Downloading ${url.href} ...`);

    // if provided: add basic auth credentials to request option
    const options = {};
    if (username && password) {
        logger.debug('Using credentials to download file.')
        options.auth = `${username}:${password}`
    }

    const downloadDir = path.dirname(downloadPath);
    await fs.mkdirSync(downloadDir, { recursive: true });

    return downloadFile(url, downloadPath, options)
        .then((downloadPath) => {
            logger.info('Download has finished.');
            workerJob.status = 'success';
            workerJob.outputs = [downloadPath];
        });
};

export { downloadFile, callbackWorker };
