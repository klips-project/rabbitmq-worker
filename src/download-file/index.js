import fs from 'fs';
import path from 'path';
import request from 'request';

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
 */
const downloadFile = async(workerJob, inputs) => {
  const uri = inputs[0];
  const target = inputs[1];
  const url = new URL(uri);
  const basename = path.basename(url.pathname);
  const pathName = path.join(target, encodeURI(basename));
  const file = fs.createWriteStream(path.join(target, encodeURI(basename)));

  log('Downloading ' + url.href + ' …');

  return new Promise((resolve, reject) => {
    request({
        uri: url.href,
    })
    .pipe(file)
    .on('finish', () => {
        log('The download has finished.');
        workerJob.status = 'success';
        workerJob.outputs = [pathName];
        resolve();
    })
    .on('error', (error) => {
        reject(error);
    })
  });
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, downloadFile);
