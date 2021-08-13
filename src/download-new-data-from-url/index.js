import fs from 'fs';
import path from 'path';
import request from 'request';

import { initialize, errorAndExit, log } from '../workerTemplate.js';
const dir = '/home/data';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Downloads data for the given URL.
 * Modifies the given job object in place with status and results.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const downloadNewDataFromURL = async(workerJob, inputs) => {
  const uri = inputs[0];
  const url = new URL(uri);
  const basename = path.basename(url.pathname);
  const pathName = path.join(dir, encodeURI(basename));
  const file = fs.createWriteStream(path.join(dir, encodeURI(basename)));

  file.on('error', errorAndExit);
  log('Downloading ' + url.href + ' …');

  await new Promise((resolve, reject) => {
    request({
        uri: url.href,
    })
    .pipe(file)
    .on('finish', () => {
        log('The download has finished.');
        resolve();
    })
    .on('error', (error) => {
        reject(error);
    })
  }).catch(errorAndExit);

  workerJob.status = 'success';
  workerJob.outputs = [pathName];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, downloadNewDataFromURL);
