import fs from 'fs-extra';
import Ajv from 'ajv';
import path from 'path';

import { initialize, log } from '../workerTemplate.js';
import { createGeotiffValidationFun } from './worker.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

// read default config
let config = fs.readJSONSync(path.join(process.cwd(), 'config', 'config.default.json'));

// create validation function
const ajv = new Ajv();
const schemaInput = fs.readJSONSync(path.join(process.cwd(), 'config', 'schema-config.json'));
const validate = ajv.compile(schemaInput);

const callback = createGeotiffValidationFun(config, validate);
(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callback);
  } catch (e) {
    log('Error when initializing:', e);
  }
})();

export default createGeotiffValidationFun;
