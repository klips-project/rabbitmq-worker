import { initialize } from '../workerTemplate.js';
import fetch from 'node-fetch';
import logger from './child-logger.js';


const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const matterMostUrl = process.env.MATTERMOST_HOOK_URL;

/**
 * Sends a message to a mattermost chat.
 * The endpoint URL has to be given as environment variable.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @example
 *   {
       "type": "send-mattermost-message",
       "inputs": [
         "themessagetext"
       ]
     }
 */
const sendMattermostMessage = async (workerJob, inputs) => {
  const text = inputs[0];

  const message = {
    text
  };

  try {
    const response = await fetch(matterMostUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      logger.debug('Successfully sent notification to Mattermost');
    } else {
      logger.error('Sending notification to Mattermost failed');
    }
  } catch (e) {
    logger.error(`Sending notification to Mattermost failed with exception: ${e}`);
  }
  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, sendMattermostMessage);
