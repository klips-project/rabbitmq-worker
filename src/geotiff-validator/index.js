import gdal from 'gdal-async';
import fs from 'fs-extra';
import Ajv from 'ajv';
import path from 'path';

import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

import { initialize, log } from '../workerTemplate.js';
import { validateFilesize, validateBands, validateDataType, validateExtent, validateProjection } from './validator.js';
import { boundingExtent } from 'ol/extent.js';

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
  const schemaInput = fs.readJSONSync(path.join(process.cwd(), 'config', 'schema-config.json'));
  let config = fs.readJSONSync(path.join(process.cwd(), 'config', 'config.default.json'));
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

  // TODO: Register custom pro4 definitions dynamically: Maybe use ol-util ProjectionUtil
  // Check if allowedEPSGCodes contains EPSG:3035
  if (config.projection.allowedEPSGCodes.some(code => code === 3035)) {
    proj4.defs('EPSG:3035',
      '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
    register(proj4);
  }
  // Check if there are other EPSG codes allowed than 4326 or 3857 or 3035
  if (!config.projection.allowedEPSGCodes.every(code => (code === 4326 || code === 3857 || code === 3035))) {
    throw 'Other CRS than EPSG:4326, EPSG:3857, EPSG:3035 are currently not allowed.';
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


(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
  } catch (e) {
    log('Error when initializing:', e);
  }
})();

export default validateGeoTiff;
