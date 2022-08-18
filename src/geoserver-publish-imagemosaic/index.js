import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';
import fsPromises from 'fs/promises';
import path from 'path';

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
 *   Second input is the name of the existing coverage store
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
  let newPath;

  const geoServerAvailable = await isGeoServerAvailable();

  if (!geoServerAvailable ){
    console.log('Geoserver not available');
    console.log('Job should be requeued!');
    workerJob.missingPreconditions = true;
    return;
  }

  try {
    // check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(workspace, covStore);

    if (!covStoreObject) {
      // TODO Add function to create new coverage store
      // cf. grc.datastores.createImageMosaicStore
      throw 'Datastore does not exist.'
    }

    // move coverage to coverage store folder to keep file structure clean in data directory
    const fileName = path.basename(coverageToAdd);
    const oldPath = coverageToAdd;
    // the internal geoserver url always starts with 'file:', so we split it and use the second index
    const coverageStorePath = covStoreObject.coverageStore.url.split(":")[1];
    // TODO read the geoserver data dir path from rest api
    newPath = `/opt/geoserver_data/${coverageStorePath}/${fileName}`;

    // Move geotiff
    await fsPromises.rename(oldPath, newPath);
    
    await grc.imagemosaics.addGranuleByServerFile(
      workspace, covStore, newPath
    );
    log('Successfully added new granule to coverage store.');
  } catch (error) {
      log(error);
      throw 'Could not add new granule to coverage store.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [newPath];
};

/**
 * Check if the GeoServer is running.
 *
 * @returns {Boolean} If the GeoServer is running.
 */
 const isGeoServerAvailable = async () => {
  return await grc.about.exists();
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverPublishImageMosaic);
