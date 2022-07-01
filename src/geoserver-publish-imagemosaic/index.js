import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';

import path from 'path';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
// const gs_data_dir = process.env.GEOSERVER_DATADIR;

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
  const fileName = path.basename(inputs[2]);
  const coverageToAdd = inputs[2];
  
  // TODO Maybe move tif to coverage store directory to keep a clean file structure
  // TODO solve Permission problems for geoserver_data
  // const oldPath = `${gs_data_dir}/${fileName}`;
  // const newPath = `${gs_data_dir}/data/klips/${covStore}/${fileName}`;
  // await fs.rename(oldPath, newPath, function (err) {
  //   if (err) throw err
  //   console.log(`Successfully moved ${fileName}`);
  // })

  try {
    await grc.about.exists();

    // check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(workspace, covStore);

    if (!covStoreObject) {
      // TODO create new coverage store
      // cf. grc.datastores.createImageMosaicStore
      throw 'Datastore does not exist.'
    }
    
    // check if granule already exist
    // TODO fix problems to parse resonse json in grc
    const granules = await grc.imagemosaics.getGranules(
      workspace, covStore, covStore
    );

    if (!granules) {
      throw 'Could not get granules for the imagemosaic store.'
    }

    if (granules.features && granules.features.length) {
      let granuleAlreadyExist;
      granuleAlreadyExist = granules.features.some(feature => feature.properties.location === fileName);

      if (granuleAlreadyExist) {
        // TODO add logic, e.g. error handler
        throw "Granule already exists.";
      }
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
