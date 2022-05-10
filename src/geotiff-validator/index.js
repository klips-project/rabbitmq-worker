import assert from 'assert';
import fs from 'fs';

import gdal from 'gdal-async';

import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const allowedEPSGCodes = [
  "4326",
  "3857",
  "25832",
  "25833"
];

/**
 * Checks if a GeoTIFF is valid
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateGeoTiff = async (workerJob, inputs) => {
  const filePath = inputs[0];
  // define fallback validation step if nothing is defined in input arguments
  const validationSteps = inputs[1] && inputs[1].validationSteps ? inputs[1].validationSteps : ['filesize'];

  const validationResults = await Promise.all(validationSteps.map(async (step) => {
    let testResult;
    switch (step) {
      case "filesize":
        testResult = validateFilesize(filePath);
        log("step1");
        return testResult;
      case "projection":
        testResult = await validateProjection(filePath, allowedEPSGCodes);
        log("step2");
        return testResult;
      default:
        break;
    }
  }));

  if (validationResults.every(result => result)) {
      log("step3");
      log('GeoTiff is valid.');
      workerJob.status = 'success';
      workerJob.outputs = [filePath];
    } else {
      throw 'GeoTIFF is invalid.';
    }

}

/**
 * Checks if a GeoTIFF has a minimum file size
 *
 * @param {String} filePath Path to a GeoTIFF file
 * @param {Number} minimumFileSize The minimum file size in bytes
 * @returns Boolean True, if GeoTIFF is greater than the minimum file size
 */
const validateFilesize = (filePath, minimumFileSize = 1000) => {
  let stats = fs.statSync(filePath);
    assert(stats.size);

  const valid = stats.size > minimumFileSize;

  if (valid) {
    return true;
  } else {
    log(`GeoTIFF file size is below the defined minium file size of ${minimumFileSize}.`);
    throw 'GeoTIFF has invalid file size.';
  }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {String} filePath Path to a GeoTIFF file
 * @param {Array} List of allowed EPSG codes
 * @returns Boolean True, if GeoTIFF srs is supported
 */
const validateProjection = async (filePath, allowedEPSGCodes) => {
    const dataset = await gdal.openAsync(filePath);
    const projectionCode = dataset?.srs?.getAuthorityCode();
    log(`Projection Code of GeoTiff: ${projectionCode}`);

    if (allowedEPSGCodes.includes(projectionCode)) {
      return true;
    }
    else {
      throw `Projection code EPSG:${projectionCode} currently not supported.`;
    }
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
