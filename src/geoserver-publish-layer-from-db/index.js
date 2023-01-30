import GeoServerRestClient from 'geoserver-node-client/geoserver-rest-client.js';
import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';


const url = process.env.GSHOST;
const user = process.env.GSUSER;
const pw = process.env.GSPASS;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const grc = new GeoServerRestClient(url, user, pw);

/**
 * Publishes a Layer from database in GeoServer
 * Modifies the given job object in place with status.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input has to be the name of the workspace
 *   Second input is the name of the datastore containing the featuretype
 *   Third input is the native name (table name)
 *   Fourth input is the name of the layer to create
 *   Fifth input is the title of the layer to create
 *   Sixth input is the SRS of the layer, e.g. `EPSG:4326`
 * @example
 *   {
       "type": "geoserver-publish-layer-from-db",
       "inputs": [
         "testws",
         "postgis",
         "peterspoints",
         "PeterPoint",
         "Colored peter points",
         "EPSG:4326"
       ]
     }
 */
const geoserverPublishLayerFromDb = async (workerJob, inputs) => {
  const workspace = inputs[0];
  const dataStore = inputs[1];
  const nativeName = inputs[2];
  const name = inputs[3];
  const title = inputs[4];
  const srs = inputs[5];

  logger.debug('Checking GeoServer connectivity …')
  const gsExists = await grc.exists();
  if (!gsExists) {
    throw 'GeoServer not found';
  }

  const workspaceExists = await grc.workspaces.get(workspace);
  if (!workspaceExists) {
    throw 'Workspace does not exist, exiting …';
  }

  const dataStoreExists = await grc.datastores.getDataStore(workspace, dataStore);
  if (!dataStoreExists) {
    throw 'Datastore does not exist, exiting …';
  }

  const created = await grc.layers.publishFeatureType(
    workspace, dataStore, nativeName, name, title, srs, true);

  if (created) {
    logger.debug('Succesfully published Layer');
  } else {
    throw 'Could not publish Layer';
  }

  logger.debug('GeoServer worker finished');

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishLayerFromDb);
