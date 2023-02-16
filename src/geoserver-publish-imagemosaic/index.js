import { GeoServerRestClient } from 'geoserver-node-client';
import { initialize } from '../workerTemplate.js';
import { publishClassicGranule, publishCogGranule } from './publish-granule.js';
import logger from './child-logger.js';

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

/**
 * Reads a GeoTiff from the filesystem and publishes it to a coverage store.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the existing coverage store
 *   Third input is the local path where the GeoTIFF is located
 *   Fourth input defines wheter existing granule should be replaced. False by default.
 * @example
    {
       "id": 123,
       "type": "geoserver-publish-imagemosaic",
       "inputs": [
           "klips",
           "my-coverageStore",
           "/path/to/the/GeoTiff.tif",
           "true"
        ]
    }
 */
const geoserverPublishImageMosaic = async (workerJob, inputs) => {
  const ws = inputs[0];
  const covStore = inputs[1];
  const coverageToAdd = inputs[2];
  const replaceExistingGranule = inputs[3] ? inputs[3] : false;

  let newPath;

  const geoServerAvailable = await grc.about.exists();

  logger.info('Publishing GeoTIFF to image mosaic store...');

  if (!geoServerAvailable) {
    logger.debug('Geoserver not available');
    workerJob.missingPreconditions = true;
    return;
  }

  try {
    // Check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(ws, covStore);

    if (!covStoreObject) {
      throw `Coverage store ${covStore} does not exist.`;
    }

    if (coverageToAdd.startsWith('http')) {
      await publishCogGranule(grc, ws, covStore, coverageToAdd);
    } else {
      newPath = await publishClassicGranule(grc, ws, covStore, coverageToAdd, replaceExistingGranule, newPath, geoserverDataDir);
    }
  } catch (error) {
    logger.error(error);
    throw 'Could not add new granule to coverage store.';
  }

  logger.info('Finished');

  workerJob.status = 'success';
  workerJob.outputs = [newPath];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishImageMosaic);
