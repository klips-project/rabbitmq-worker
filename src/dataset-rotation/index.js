import { GeoServerRestClient } from 'geoserver-node-client';
import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import path from 'path';
import * as fs from 'fs/promises';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const geoserverDataDir = process.env.GEOSERVER_DATA_DIR;

const grc = new GeoServerRestClient(url, user, pw);

const callbackWorker = async (workerJob, inputs) => {
  const inputPath = inputs[0];
  const outputPath = inputs[0];
  const finalDatadir = inputs[1];
  const ws = inputs[2];
  const covStore = inputs[3];
  const coverage = inputs[3];
  const fileURL = inputs[4];
  const inputFilename = path.basename(inputPath);
  // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
  const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
  const matches = inputFilename.match(regex);
  const region = matches[1];
  // timestamp in filename is in UTC time, round to last hour
  const datasetTimestamp = dayjs.utc(matches[2], 'YYYYMMDDTHHmmZ').startOf('hour');

  if (!datasetTimestamp.isValid()) {
    // timestamp of dataset not valid
    logger.error('Could not parse dataset timestamp.');
    throw 'Could not parse dataset timestamp.';
  }

  // get timestamp for current hour
  const currentTimestamp = dayjs.utc().startOf('hour');

  // check if incomimg dataset timestamp === current timestamp
  if (datasetTimestamp.isSame(currentTimestamp)) {
    // delete previous dataset with index -48 (49 hours before current timestamp)
    const timestampToDelete = datasetTimestamp.subtract(49, 'hours');
    const fileToDelete = `${region}_${timestampToDelete.format('YYYYMMDDTHHmm')}Z.tif`;
    const covFileLocation = `${path.dirname(fileURL)}/${fileToDelete}`;

    try {
      await fs.rm(`${finalDatadir}/${region}/${region}_temperature/${fileToDelete}`);
    } catch (error) {
      logger.error(`Could not delete dataset with timestamp: ${timestampToDelete}.`);
    }
    // Delete corresponding timestamp dataset in GeoServer image mosaic
    try {
      const geoServerAvailable = await grc.about.exists();

      if (!geoServerAvailable) {
        logger.debug('Geoserver not available');
        workerJob.missingPreconditions = true;
        return;
      }
      // Check if coverage store exists
      const covStoreObject = await grc.datastores.getCoverageStore(ws, covStore);

      if (!covStoreObject) {
        throw `Coverage store ${covStore} does not exist.`;
      } else {
        newPath = await grc.imagemosaics.deleteSingleGranule(ws, covStore, coverage, covFileLocation);
      };
    } catch (error) {
      logger.error(`Could not delete granule with timestamp: ${timestampToDelete}.`)
    }
  }
  workerJob.status = 'success';
  workerJob.outputs = [outputPath];

  logger.info(`Dataset rotation finished.`);
  logger.debug({ outputPath: outputPath });
};

(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callbackWorker, geoserverDeleteGranule);
  } catch (error) {
    logger.error({ error: error }, `Problem when initializing`);
  }
})();

export default callbackWorker;
