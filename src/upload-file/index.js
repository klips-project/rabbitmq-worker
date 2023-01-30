import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Uploads the given file to the given target.
 * First input defines the path to the file that should be uploaded.
 * This worker needs to have access to the file locally.
 * Second input is the URL the file should be uploaded to.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @returns {Object} The workerJob
 * @example
 *
    {
      "id": 4,
      "type": "upload-file",
      "inputs": ["/home/data/mycustomfile.zip", "http://example.com/upload"],
    }
 */
const uploadFile = async (workerJob, inputs) => {
  logger.debug('Uploading a file …');

  const file = inputs[0];
  const target = inputs[1];
  const form = new FormData();

  form.append('file', fs.readFileSync(file));

  logger.debug("Pushing file to " + target);

  const response = await fetch(target, {
    method: 'POST',
    body: form
  });

  if (response.status === 200) {
    logger.debug('Upload succeeded');
    workerJob.status = 'success';
    workerJob.outputs = [];
  } else {
    throw 'Upload failed: ' + response.statusText;
  }
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, uploadFile);
