import { Dispatcher } from './dispatcher.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;

const rabbitConf = {
  hostname: process.env.RABBITHOST,
  username: process.env.RABBITUSER,
  password: process.env.RABBITPASS,
  heartbeat: process.env.RABBITHEARTBEAT || 60
};

const dispatcher = new Dispatcher(workerQueue, resultQueue, rabbitConf);

dispatcher.init();

