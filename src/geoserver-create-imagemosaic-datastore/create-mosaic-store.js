import fsPromises from 'fs/promises';
import path from 'path';
import { log } from '../workerTemplate.js';
import { classicConfigFiles, cogConfigFiles } from './geoserver-config-templates.js';
import AdmZip from 'adm-zip';


/**
 * Create a classic image mosaic store with time support.
 *
 * @param {Object} grc An instance of the GeoServer REST client
 * @param {Object} pgConf The Postgres credentials with these properties: host, port, schema, database, user, password
 * @param {string} ws The name of the workspace
 * @param {string} covStore The name of the coverage store
 * @param {string} prototypeGranule The path of the prototype granule
 * @param {string} geoserverDataDir The path of the GeoServer data directory
 */
export const createClassicMosaicStore = async (grc, pgConf, ws, covStore, prototypeGranule, geoserverDataDir) => {

  const { host, port, schema, database, user, password } = pgConf;
  if (!host || !port || !schema || !database || !user || !password) {
    throw 'PostgreSQL credentials are not complete.'
  }

  log(`CoverageStore ${covStore}  does not exist. Try to create it ...`);

  ////////////////////////////////
  ///// indexer.properties ///////
  ////////////////////////////////

  let indexerContent = classicConfigFiles.indexer;
  indexerContent = indexerContent.replace(/__NAME__/, covStore);

  ////////////////////////////////
  ///// datastore.properties /////
  ////////////////////////////////

  let dataStoreContent = classicConfigFiles.datastore;

  dataStoreContent = dataStoreContent.replace(/__DATABASE_HOST__/g, host);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PORT__/g, port);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_SCHEMA__/g, schema);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_NAME__/g, database);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_USER__/g, user);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PASSWORD__/g, password);

  const zip = new AdmZip();
  zip.addFile('datastore.properties', Buffer.from(dataStoreContent));
  zip.addFile('indexer.properties', Buffer.from(indexerContent));
  zip.addFile('timeregex.properties', Buffer.from(classicConfigFiles.timeregex));
  const zipPath = '/tmp/init.zip';
  zip.writeZip(zipPath)

  log('Creating datastore directory');
  const mosaicDir = path.join(geoserverDataDir, 'data', ws, covStore);
  await fsPromises.mkdir(mosaicDir, { recursive: true });

  log('Copy prototype granule to datastore directory');
  const prototypeGranuleName = path.basename(prototypeGranule);
  const mosaicPath = path.join(mosaicDir, prototypeGranuleName);
  await fsPromises.copyFile(prototypeGranule, mosaicPath);

  log('Create image mosaic store via REST');
  await grc.datastores.createImageMosaicStore(ws, covStore, zipPath);

  log(`... CoverageStore ${covStore} created`);

  log('Initialize the store');
  // Once a prototype has been provided we need to initialize the store by querying it for the available coverages.
  // TODO check if really is neccessary
  // http://localhost:8080/geoserver/rest/workspaces/{ws}/coveragestores/{covname}/coverages.json?list=all

  log('Initialize the store');
  await grc.datastores.initCoverageStore(ws, covStore);

  log(`Enabling time for layer "${ws}:${covStore}"`);
  const presentation = 'LIST';
  const resolution = 3600000;
  const defaultValue = 'MAXIMUM';
  const nearestMatchEnabled = true;
  const rawNearestMatchEnabled = false;
  const acceptableInterval = 'PT1H';

  await grc.layers.enableTimeCoverageFor(ws, covStore, covStore, presentation, resolution, defaultValue, nearestMatchEnabled, rawNearestMatchEnabled, acceptableInterval);
  log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);
};

/**
 * Create a COG-based image mosaic store with time support.
 *
 * @param {Object} grc An instance of the GeoServer REST client
 * @param {Object} pgConf The Postgres credentials with these properties: host, port, schema, database, user, password
 * @param {string} ws The name of the workspace
 * @param {string} covStore The name of the coverage store
 * @param {string} prototypeGranule The url of the prototype granule
 */
export const createCogMosaicStore = async (grc, pgConf, ws, covStore, prototypeGranule) => {

  const { host, port, schema, database, user, password } = pgConf;
  if (!host || !port || !schema || !database || !user || !password) {
    throw 'PostgreSQL credentials are not complete.'
  }

  log(`CoverageStore ${covStore}  does not exist. Try to create it ...`);

  ////////////////////////////////
  ///// indexer.properties ///////
  ////////////////////////////////

  let indexerContent = cogConfigFiles.indexer;
  indexerContent = indexerContent.replace(/__NAME__/, covStore);

  ////////////////////////////////
  ///// datastore.properties /////
  ////////////////////////////////

  const readData = cogConfigFiles.datastore;

  let dataStoreContent = readData.replace(/__DATABASE_HOST__/g, pgConf.host);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PORT__/g, pgConf.port);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_SCHEMA__/g, pgConf.schema);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_NAME__/g, pgConf.database);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_USER__/g, pgConf.user);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PASSWORD__/g, pgConf.password);

  const zip = new AdmZip();
  zip.addFile('datastore.properties', Buffer.from(dataStoreContent));
  zip.addFile('indexer.properties', Buffer.from(indexerContent));
  zip.addFile('timeregex.properties', Buffer.from(cogConfigFiles.timeregex));
  const zipPath = '/tmp/init_cog.zip';
  zip.writeZip(zipPath)

  log('Create image mosaic store via REST');
  const autoconfigure = false;
  await grc.datastores.createImageMosaicStore(ws, covStore, zipPath, autoconfigure);

  log(`... CoverageStore ${covStore} created`);

  log('Add sample granule');
  await grc.imagemosaics.addGranuleByRemoteFile(ws, covStore, prototypeGranule);

  log('Initialize the store');
  await grc.datastores.initCoverageStore(ws, covStore);

  log(`Enabling time for layer "${ws}:${covStore}"`);
  const presentation = 'LIST';
  const resolution = 3600000;
  const defaultValue = 'MAXIMUM';
  const nearestMatchEnabled = true;
  const rawNearestMatchEnabled = false;
  const acceptableInterval = 'PT1H';

  await grc.layers.enableTimeCoverageForCogLayer(ws, covStore, covStore, presentation, resolution, defaultValue, nearestMatchEnabled, rawNearestMatchEnabled, acceptableInterval);
  log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);

};
