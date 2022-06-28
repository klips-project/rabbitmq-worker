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
 * Reads a GeoTiff from the filesystem and publishes it to GeoServer.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the created datastore
 *   Third input is the the name of the created layer
 *   Fourth input is the title of the created layer
 *   Fifth input is the local path where the GeoTIFF is located
 * @example
    {
       "id": 123,
       "type": "geoserver-publish-geotiff",
       "inputs": [
           "klips",
           "my-datastore",
           "my-name",
           "my-title",
           "/path/to/the/GeoTiff.tif"
        ]
    }
 */
const geoserverPublishGeoTiff = async (workerJob, inputs) => {

  const workspace = inputs[0];
  const dataStore = inputs[1];
  const layerName = inputs[2];
  const layerTitle = inputs[3];
  const geoTiffPath = inputs[4];

  try {
    await grc.about.exists();
    await grc.datastores.createGeotiffFromFile(
      workspace, dataStore, layerName, layerTitle, geoTiffPath
    );
    log('Successfully published GeoTIFF');
  } catch (error) {
    log(error)
    throw 'Could not publish GeoTIFF';
  }

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishGeoTiff);
