import fs from 'fs-extra';
import path from 'path';

import { initialize } from '../workerTemplate.js';
import { createGeotiffValidationFun } from './worker.js';
import logger from './child-logger.js';


const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

// read default config
let config = fs.readJSONSync(path.join(process.cwd(), 'config', 'config.default.json'));

const callback = createGeotiffValidationFun(config);
(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callback);
  } catch (error) {
    logger.error( {error:error}, `Error when initializing`);
  }
})();

export default createGeotiffValidationFun;
