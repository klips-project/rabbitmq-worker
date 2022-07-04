import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const grc = new GeoServerRestClient(url, user, pw);

/**
 * Reads a GeoTiff from the filesystem and publishes it to a coverage store.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the coverage store
 *   Third input is the local path where the GeoTIFF is located
 * @example
    {
       "id": 123,
       "type": "geoserver-publish-imagemosaic",
       "inputs": [
           "klips",
           "my-coverageStore",
           "/path/to/the/GeoTiff.tif"
        ]
    }
 */
const geoserverPublishImageMosaic = async (workerJob, inputs) => {

  const workspace = inputs[0];
  const covStore = inputs[1];
  const coverageToAdd = inputs[2];

  try {
    await grc.about.exists();

    // check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(workspace, covStore);

    if (!covStoreObject) {
      // TODO Add function to create new coverage store
      // cf. grc.datastores.createImageMosaicStore
      throw 'Datastore does not exist.'
    }
    
    await grc.imagemosaics.addGranuleByServerFile(
      workspace, covStore, coverageToAdd
    );
    log('Successfully added new granule to coverage store.');
  } catch (error) {
      log(error);
      throw 'Could not add new granule to coverage store.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishImageMosaic);
