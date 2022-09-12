import { GeoServerRestClient } from 'geoserver-node-client';
import { log, initialize } from '../workerTemplate.js';
import fsPromises from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const pgHost = process.env.POSTGRES_HOST;
const pgPort = process.env.POSTGRES_PORT;
const pgSchema = process.env.POSTGRES_SCHEMA;
const pgUser = process.env.POSTGRES_USER;
const pgPassword = process.env.POSTGRES_PASSWORD;
const pgDb = process.env.POSTGRES_DB;

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
      workerJob.outputs = [covStoreObject.coverageStore.name];
      return;
    }
    // code originally from Sauber project
    // cf. https://github.com/meggsimum/sauber-sdi-docker/blob/master/geoserver_publisher/index.js
    log(`CoverageStore ${covStore}  does not exist. Try to create it ...`);

    ////////////////////////////////
    ///// indexer.properties ///////
    ////////////////////////////////

    log('... extending indexer file');

    const indexerFile = process.cwd() + '/gs-img-mosaic-tpl/indexer.properties.tpl';
    const indexerFileCopy = process.cwd() + '/gs-img-mosaic-tpl/indexer.properties';
    // copy indexer template so we can modify
    await fsPromises.copyFile(indexerFile, indexerFileCopy);
    log(`${indexerFile} was copied to ${indexerFileCopy}`);
    // set name of imagemosaic store
    const nameText = '\nName=' + covStore;
    await fsPromises.appendFile(indexerFileCopy, nameText);
    log('... DONE extending indexer file');

    ////////////////////////////////
    ///// datastore.properties /////
    ////////////////////////////////

    const dataStoreTemplateFile = process.cwd() + '/gs-img-mosaic-tpl/datastore.properties.tpl';
    const dataStoreFile = process.cwd() + '/gs-img-mosaic-tpl/datastore.properties';

    log('... replacing dataStore file');
    const readData = await fsPromises.readFile(dataStoreTemplateFile, 'utf8');

    let adaptedContent = readData.replace(/__DATABASE_HOST__/g, pgHost);
    adaptedContent = adaptedContent.replace(/__DATABASE_PORT__/g, pgPort);
    adaptedContent = adaptedContent.replace(/__DATABASE_SCHEMA__/g, pgSchema);
    adaptedContent = adaptedContent.replace(/__DATABASE_NAME__/g, pgDb);
    adaptedContent = adaptedContent.replace(/__DATABASE_USER__/g, pgUser);
    adaptedContent = adaptedContent.replace(/__DATABASE_PASSWORD__/g, pgPassword);

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


    log('Creating datastore directory');
    const mosaicDir = path.join(geoserverDataDir, 'data', ws, covStore);
    await fsPromises.mkdir(mosaicDir, { recursive: true });

    log('Copy prototype granule to datastore directory');
    const prototypeGranuleName = path.basename(prototypeGranule);
    const mosaicPath = path.join(mosaicDir, prototypeGranuleName);
    await fsPromises.copyFile(prototypeGranule, mosaicPath);

    log('Create image mosaic store via REST');
    await grc.datastores.createImageMosaicStore(ws, covStore, zipPath, false);

    log(`... CoverageStore ${covStore} created`);

    log('Initialize the store');
    // Once a prototype has been provided we need to initialize the store by querying it for the available coverages.
    // TODO check if really is neccessary
    // http://localhost:8080/geoserver/rest/workspaces/{ws}/coveragestores/{covname}/coverages.json?list=all

    log(`Enabling time for layer "${ws}:${covStore}"`);
    await grc.layers.enableTimeCoverage(ws, covStore, covStore, 'LIST', 3600000, 'MAXIMUM', true, false, 'PT30M');
    log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);

  } catch (error) {
    log(error);
    throw 'Could not create CoverageStore.';
  }

  workerJob.status = 'success';
  workerJob.outputs = [covStore];
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
