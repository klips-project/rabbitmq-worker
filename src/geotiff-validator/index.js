import assert from 'assert';
import fs from 'fs';

import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Checks if a GeoTIFF is valid
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateGeoTiff = async (workerJob, inputs) => {
  const filePath = inputs[0];

  // TODO: currently a dummy test with the file size is done
  //       some actual validation should be performed
  let stats;
  try {
    stats = fs.statSync(filePath);
    assert(stats.size);
  } catch (error) {
    throw 'Could not get stats about input file'
  }

  const kiloByte = 1000;

  console.log(stats);
  console.log(stats.size);

  const valid = stats.size > kiloByte;
  console.log(valid);
  if (valid) {
    log('GeoTIFF is valid');
  } else {
    throw 'GeoTIFF is invalid';
  }

  workerJob.status = 'success';
  workerJob.outputs = [filePath];
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
