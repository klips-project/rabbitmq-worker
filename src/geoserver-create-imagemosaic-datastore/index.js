import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';
import { isGeoServerAvailable } from './util.js';
import { createClassicMosaicStore, createCogMosaicStore } from './create-mosaic-store.js';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;


const pgConf = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  schema: process.env.POSTGRES_SCHEMA,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB
};

const geoserverDataDir = process.env.GEOSERVER_DATA_DIR;

const grc = new GeoServerRestClient(url, user, pw);

/**
 * Creates a imagemosaic datastore in GeoServer based on template configuration files
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the coverage store to be created
 *   Third input is the path to the first coverage that also serves as prototype for the store
 * @example
    {
       "id": 123,
       "type": "geoserver-create-imagemosaic-datastore",
       "inputs": [
           "klips",
           "my-coverageStore",
           "/path/to/tif/20220909T1400.tif"
        ]
    }
 */
const geoserverCreateImageMosaicDatastore = async (workerJob, inputs) => {
  const ws = inputs[0];
  const covStore = inputs[1];
  const prototypeGranule = inputs[2];
  const geoServerAvailable = await isGeoServerAvailable(grc);

  if (!geoServerAvailable) {
    log('Geoserver not available');
    log('Job should be requeued!');
    workerJob.missingPreconditions = true;
    return;
  }

  try {
    // check if coverage store exists
    const covStoreObject = await grc.datastores.getCoverageStore(ws, covStore);

    if (covStoreObject) {
      log("Datastore already exists!")
      workerJob.status = 'success';
      workerJob.outputs = [covStoreObject.coverageStore.name];
      return;
    }

    if (prototypeGranule.startsWith('http')){
      const tmpPrototypeGranule = 'http://nginx/ecostress/20220214T1146Z.tif';
      await createCogMosaicStore(grc, pgConf, ws, covStore, tmpPrototypeGranule);
    } else {
      await createClassicMosaicStore(grc, ws, covStore, prototypeGranule, geoserverDataDir, pgConf);
    }



  } catch (error) {
    log(error);
    throw 'Could not create CoverageStore.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [covStore];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverCreateImageMosaicDatastore);
