import Ajv from "ajv"

const ajv = new Ajv();

import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const schema_input = {
  $id: "json",
  type: "object",
  properties: {
    "category": {type: "string"},
    "source": {type: "string"},
    "email": {type: "string"},
    "payload": {type: "object"},
  },
  required: [
    "category",
    "source",
    "email",
    "payload"
  ],
  additionalProperties: true
}

/**
 * Checks if a JSON is valid
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateJSON = async (workerJob, inputs) => {
  const json = inputs[0];
  const validate = ajv.compile(schema_input);

  if (validate(json)) {
    log('JSON is valid.');
    workerJob.status = 'success';
  } else {
    throw 'JSON is invalid.';
  }
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateJSON);
