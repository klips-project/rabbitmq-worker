import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { URL } from 'url';

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
const downloadFile = async (workerJob, inputs) => {
    const uri = inputs[0];
    const downloadPath = inputs[1];
    const username = inputs[2];
    const password = inputs[3];
    const url = new URL(uri);

    log('Downloading ' + url.href + ' …');

    // choose correct library depending on protocol
    let protocol;
    if (url.protocol === 'http:') {
        protocol = http;
    } else if (url.protocol === 'https:') {
        protocol = https;
    } else {
        throw `Url does not start with 'http' or 'https'`
    }

    // if provided: add basic auth credentials to request option
    const options = {};
    if (username && password) {
        options.auth = `${username}:${password}`
    }

    const downloadDir = path.dirname(downloadPath);
    const downloadDirExist = fs.existsSync(downloadDir);

    if (!downloadDirExist) {
        throw 'Target directory for download does not exist.'
    }

    return new Promise((resolve, reject) => {
        protocol.get(url.href,
            options,
            response => {
                if (response.statusCode === 200) {
                    const fileWriter = fs
                        .createWriteStream(downloadPath)
                        .on('finish', () => {
                            log('The download has finished.');
                            workerJob.status = 'success';
                            workerJob.outputs = [downloadPath];
                            resolve({})
                        })
                        .on('error', (error) => {
                            log(error);
                            return reject(new Error(error))
                        });
                    response.pipe(fileWriter)
                } else {
                    return reject(new Error(response.statusMessage))
                }
            })
    })
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, downloadFile);
