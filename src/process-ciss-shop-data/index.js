import { log, initialize, errorAndExit } from '../workerTemplate.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;

/**
 * Publishes a Metadataset in GeoNetwork
 * Modifies the given job object in place with status.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const processCissShopData = async (workerJob, inputs) => {
  const dbName = inputs[0];
  const tableName = inputs[1];
  const measuredPointsIds = inputs[2].split(','); // has to be a string with comma separated IDs
  const timePeriodStart = inputs[3];
  const timePeriodEnd = inputs[4];
  const heights = inputs[5].split(','); // has to be a string with comma separated height values
  const exportFormat = inputs[6];
  const contactEmail = inputs[7];

  log('Checking the submitted parameters …');
  if (
    !dbName ||
    !tableName ||
    !Array.isArray(measuredPointsIds) ||
    !timePeriodStart ||
    !timePeriodEnd ||
    !Array.isArray(heights) ||
    !exportFormat ||
    !contactEmail
  ) {
    errorAndExit('Please fill in all parameters');
  }

  //   TODO Add process to prepare data (check) for our products like wind rose, energy rose and Weibull parameters

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, workerQueue, resultQueue, processCissShopData);
