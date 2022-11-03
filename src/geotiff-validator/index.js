import fs from 'fs-extra';
import Ajv from 'ajv';
import path from 'path';

import { initialize, log } from '../workerTemplate.js';
import { GeotiffValidator } from './validator.js';

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

  const geotiffValidator = new GeotiffValidator(config);
  const validationResults = await geotiffValidator.performValidation(filePath, validationSteps);

  const validationErrors = validationResults.filter(result => {
    return !result.valid;
  })

  if (validationErrors.length === 0) {
    log('GeoTiff is valid.');
    workerJob.status = 'success';
    workerJob.outputs = [filePath];
  } else {
    let errorMessage = 'GeoTIFF is invalid:';
    validationErrors.forEach(validationError => {
      errorMessage = `${errorMessage}\n${validationError.type}: ${validationError.info}`;
    });
    throw errorMessage;
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
