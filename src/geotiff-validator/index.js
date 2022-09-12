import fs from 'fs';

import gdal from 'gdal-async';

import yaml from 'js-yaml';

import { boundingExtent, containsExtent } from 'ol/extent.js';

import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

let config;

// Load config
try {
  config = yaml.load(fs.readFileSync(process.cwd() + '/config.yml', 'utf8'));
} catch (e) {
  log(e);
  log(`Cannot load worker config.`, e);
  process.exit();
}


/**
 * Checks if a GeoTIFF is valid.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateGeoTiff = async (workerJob, inputs) => {
  const filePath = inputs[0];
  // define fallback validation step if nothing is defined in input arguments
  const validationSteps = inputs[1] && inputs[1].validationSteps ? inputs[1].validationSteps : ['filesize', 'projection', 'datatype','bands'];
  let dataset;

  // check if validationsteps include a GDAL based validator
  const requiresGdalvalidation = validationSteps.filter(step => [
    'projection',
    'extent',
    'datatype',
    'bands'
  ].includes(step)).length;

  if (requiresGdalvalidation) {
    try {
      dataset = await gdal.openAsync(filePath);
    } catch (error) {
      throw `Could not open dataset: $error`;
    }
  }

  const validationResults = await Promise.all(validationSteps.map(async (step) => {
    switch (step) {
      case "filesize":
        return validateFilesize(filePath, config.minFilesize, config.maxFilesize);
      case "projection":
        return await validateProjection(dataset, config.allowedEPSGCodes);
      case "extent":
        return await validateExtent(dataset, boundingExtent(config.allowedExtent));
      case "datatype":
        return await validateDataType(dataset, config.allowedDataTypes);
      case "bands":
        return await validateBands(dataset);
      default:
        break;
    }
  }));

  if (validationResults.every(result => result)) {
    log('GeoTiff is valid.');
    workerJob.status = 'success';
    workerJob.outputs = [filePath];
  } else {
    throw 'GeoTIFF is invalid.';
  }

}

/**
 * Checks if a GeoTIFF has a minimum file size.
 *
 * @param {String} filePath Path to a GeoTIFF file
 * @param {Number} [minimumFileSize=1000] The minimum file size in bytes, default is 1000 (1KB)
 * @param {Number} [maximumFileSize=10000000] The maximum file size in bytes, default is 10000000 (10MB)
 * @returns {Boolean} True, if GeoTIFF is greater than the minimum file size
 */
const validateFilesize = (filePath, minimumFileSize = 1000, maximumFileSize = 10000000) => {
  let stats = fs.statSync(filePath);
  const valid = stats.size && stats.size > minimumFileSize && stats.size < maximumFileSize;

  if (valid) {
    return true;
  } else {
    log(`GeoTIFF file size is out of the allowed range: ${minimumFileSize} - ${maximumFileSize}.`);
    throw 'GeoTIFF has invalid file size.';
  }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedEPSGCodes List of allowed EPSG codes
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateProjection = async (dataset, allowedEPSGCodes) => {
  const projectionCode = dataset?.srs?.getAuthorityCode();
  log(`Projection Code of GeoTiff: ${projectionCode}`);

  if (allowedEPSGCodes.includes(projectionCode)) {
    return true;
  }
  else {
    throw `Projection code EPSG:${projectionCode} is not supported.`;
  }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedExtent List of allowed EPSG codes
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateExtent = async (dataset, allowedExtent) => {
  const envenlope = dataset?.bands?.getEnvelope();
  // compose ol extent
  const olExtent = boundingExtent([
    [envenlope.minX, envenlope.minY],
    [envenlope.maxX, envenlope.maxY]
  ]);

  log(`Extent of GeoTiff: ${olExtent}`);

  if (containsExtent(allowedExtent, olExtent)) {
    return true;
  }
  else {
    throw `Invalid extent: ${olExtent.toString()}.`;
  }
}

/**
 * Checks if a GeoTIFF has an allowed datatype.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedDataTypes Allowed datatypes
 * @returns {Boolean} True, if GeoTIFF datatype is supported
 */
const validateDataType = async (dataset, allowedDataTypes) => {
  const dataType = dataset?.bands?.get(1)?.dataType;

  log(`Datatype of GeoTiff: ${dataType}`);

  if (allowedDataTypes.includes(dataType)) {
    return true;
  }
  else {
    throw `Datatype :${dataType} currently not supported.`;
  }
}

/**
 * Checks if a GeoTIFF has a minimum number of bands.
 * TODO Enhance this test or check if it is necessary.
 *
 * @param {Object} dataset GDAL dataset
 * @returns {Boolean} True, if GeoTIFF has minimum number of bands
 */
const validateBands = async (dataset) => {
  const countBands = dataset?.bands?.count();

  log(`GeoTiff has ${countBands} band(s).`);

  if (countBands > 0) {
    return true;
  }
  else {
    throw `GeoTIFF has an invalid number of bands.`;
  }
}

(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
  } catch (e) {
    log('Error when initializing:', e);
  }
})();

export default validateGeoTiff;
