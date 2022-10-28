import gdal from 'gdal-async';
import fs from 'fs-extra';
import Ajv from 'ajv';
import path from 'path';

import { transformExtent } from 'ol/proj.js';
import { boundingExtent, containsExtent } from 'ol/extent.js';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

import { initialize, log, debugLog } from '../workerTemplate.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Checks if a GeoTIFF is valid.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateGeoTiff = async (workerJob, inputs) => {
  const schemaInput = fs.readJSONSync(path.join(process.cwd(), 'config/schema-config.json'));
  let config = fs.readJSONSync(path.join(process.cwd(), 'config/config.default.json'));
  const filePath = inputs[0];
  // handle configuration from job
  let validationSteps;
  if (config) {
    validationSteps = inputs[1] ? Object.keys(inputs[1]) : Object.keys(config);
  }
  let jobConfig = inputs[1] ? inputs[1] : false;

  // overwrite worker configuration
  if (jobConfig) {
    config = { ...config, ...jobConfig };
  }

  // validate config
  const ajv = new Ajv();
  const validate = ajv.compile(schemaInput);

  if (!validate(config)) {
    throw "Worker configuration not valid.";
  }

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
      throw `Could not open dataset: ${error}`;
    }
  }

  // TODO Register custom pro4 definitions dynamically: Maybe use ol-util ProjectionUtil
  // Check if allowedEPSGCodes contains EPSG:3035
  if (config.projection.allowedEPSGCodes.some(code => code === 3035)) {
    proj4.defs('EPSG:3035',
      '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
    register(proj4);
  }
  // Check if there are other EPSG codes allowed than 4326 or 3857 or 3035
  if (!config.projection.allowedEPSGCodes.every(code => (code === 4326 || code === 3857 || code === 3035))) {
    throw 'Other CRS than EPSG:4326, EPSG:3857, EPSG:3035 are not currently.';
  }

  const validationResults = await Promise.all(validationSteps.map(async (step) => {
    switch (step) {
      case "fileSize":
        return validateFilesize(
          filePath, config.fileSize.minFileSize, config.fileSize.maxFileSize);
      case "projection":
        return await validateProjection(dataset, config.projection.allowedEPSGCodes);
      case "extent":
        return await validateExtent(dataset, boundingExtent(config.extent.allowedExtent));
      case "dataType":
        return await validateDataType(dataset, config.dataType.allowedDataTypes);
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
 * @param {Number} [minimumFileSize=1000] The minimum file size in bytes
 * @returns {Boolean} True, if GeoTIFF is greater than the minimum file size
 */
const validateFilesize = (filePath, minimumFileSize, maximumFileSize) => {
  let stats = fs.statSync(filePath);
  const valid = stats.size && stats.size > minimumFileSize && stats.size < maximumFileSize;

  if (valid) {
    debugLog(`FileSize of GeoTIFF is valid.`);
    return true;
  } else {
    debugLog(`GeoTIFF file size is out of the allowed range: ${minimumFileSize} - ${maximumFileSize}.`);
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
const validateProjection = async (dataset, allowedEPSGCodes = ["4326"]) => {
  const projectionCode = dataset?.srs?.getAuthorityCode();

  if (allowedEPSGCodes.includes(parseInt(projectionCode))) {
    debugLog(`Projection code of GeoTiff EPSG:${projectionCode} is valid.`);
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
  let olExtent = boundingExtent([
    [envenlope.minX, envenlope.minY],
    [envenlope.maxX, envenlope.maxY]
  ]);
  const projectionCode = dataset?.srs?.getAuthorityCode();

  if (projectionCode !== "4326") {
    olExtent = transformExtent(olExtent, `EPSG:${projectionCode}`, "EPSG:4326");
  }

  if (containsExtent(allowedExtent, olExtent)) {
    debugLog(`Extent of GeoTiff: ${olExtent} is valid.`);
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

  if (allowedDataTypes.includes(dataType)) {
    debugLog(`Datatype of GeoTiff "${dataType}" is valid.`);
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

  debugLog(`GeoTiff has ${countBands} band(s).`);

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
