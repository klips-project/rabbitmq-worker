import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';
import fsPromises from 'fs/promises';
import { exec } from 'child_process';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const pgPassword = process.env.POSTGRES_PASSWORD;

const grc = new GeoServerRestClient(url, user, pw);

/**
 * Creates a imagemosaic datastore in GeoServer based on template configuration files
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the workspace to publish to
 *   Second input is the name of the coverage store to be created
 * @example
    {
       "id": 123,
       "type": "geoserver-create-imagemosaic-datastore",
       "inputs": [
           "klips",
           "my-coverageStore"
        ]
    }
 */
const geoserverCreateImageMosaicDatastore = async (workerJob, inputs) => {
  const ws = inputs[0];
  const covStore = inputs[1];
  const geoServerAvailable = await isGeoServerAvailable();

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
      workerJob.outputs = [covStoreObject.name];
      return;
    }
    // code originally from Sauber project
    // cf. https://github.com/meggsimum/sauber-sdi-docker/blob/master/geoserver_publisher/index.js
    log('CoverageStore', covStore, 'does not exist. Try to create it ...');

    ////////////////////////////////
    ///// indexer.properties ///////
    ////////////////////////////////

    log('... extending indexer file');

    const indexerFile = process.cwd() + '/gs-img-mosaic-tpl/indexer.properties.tpl';
    const indexerFileCopy = process.cwd() + '/gs-img-mosaic-tpl/indexer.properties';
    // copy indexer template so we can modify
    await fsPromises.copyFile(indexerFile, indexerFileCopy);
    log(`${indexerFile} was copied to ${indexerFileCopy}`);

    ////////////////////////////////
    ///// datastore.properties /////
    ////////////////////////////////

    const dataStoreTemplateFile = process.cwd() + '/gs-img-mosaic-tpl/datastore.properties.tpl';
    const dataStoreFile = process.cwd() + '/gs-img-mosaic-tpl/datastore.properties';

    log('... replacing dataStore file');
    const readData = await fsPromises.readFile(dataStoreTemplateFile, 'utf8');

    const adaptedContent = readData.replace(/__DATABASE_PASSWORD__/g, pgPassword);
    log({ adaptedContent })
    await fsPromises.writeFile(dataStoreFile, adaptedContent);
    log('... DONE Replacing datastore file');

    // zip image mosaic properties config files
    const fileToZip = [
      'gs-img-mosaic-tpl/indexer.properties',
      'gs-img-mosaic-tpl/datastore.properties',
      'gs-img-mosaic-tpl/timeregex.properties'
    ];
    const zipPath = '/tmp/init.zip';

    await execShellCommand('zip -j ' + zipPath + ' ' + fileToZip.join(' '));

    await grc.datastores.createImageMosaicStore(ws, covStore, zipPath);

    log('... CoverageStore', covStore, 'created');

  } catch (error) {
    log(error);
    throw 'Could not create CoverageStore.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [];
};

/**
 * Check if the GeoServer is running.
 *
 * @returns {Boolean} If the GeoServer is running.
 */
const isGeoServerAvailable = async () => {
  return await grc.about.exists();
}

/**
 * Executes a shell command and return it as a Promise.
 * Kudos to https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 *
 * @param cmd {string}
 * @return {Promise<string>}
 */
const execShellCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoserverCreateImageMosaicDatastore);
