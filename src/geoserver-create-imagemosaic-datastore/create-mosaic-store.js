import fsPromises from 'fs/promises';
import path from 'path';
import { log } from '../workerTemplate.js';
import { classicConfigFiles, cogConfigFiles } from './geoserver-config-templates.js';
import AdmZip from 'adm-zip';


export const createClassicMosaicStore = async (grc, ws, covStore, prototypeGranule, geoserverDataDir, pgConf) => {
  // TODO: check pgConf or add defaults

  // code originally from Sauber project
  // cf. https://github.com/meggsimum/sauber-sdi-docker/blob/master/geoserver_publisher/index.js
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

  dataStoreContent = dataStoreContent.replace(/__DATABASE_HOST__/g, pgConf.host);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PORT__/g, pgConf.port);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_SCHEMA__/g, pgConf.schema);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_NAME__/g, pgConf.database);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_USER__/g, pgConf.user);
  dataStoreContent = dataStoreContent.replace(/__DATABASE_PASSWORD__/g, pgConf.password);

  const zipPath = '/tmp/init.zip';

  const zip = new AdmZip();
  zip.addFile(
    'gs-img-mosaic-tpl/datastore.properties',
    Buffer.from(dataStoreContent, "utf8")
  );
  zip.addFile(
    'gs-img-mosaic-tpl/indexer.properties',
    Buffer.from(indexerContent, "utf8")
  );
  zip.addFile(
    'gs-img-mosaic-tpl/timeregex.properties',
    Buffer.from(classicConfigFiles.timeregex, "utf8")
  );

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

  log(`Enabling time for layer "${ws}:${covStore}"`);
  await grc.layers.enableTimeCoverage(ws, covStore, covStore, 'LIST', 3600000, 'MAXIMUM', true, false, 'PT1H');
  log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);

};

// TODO: docs
export const createCogMosaicStore = async (grc, pgConf, ws, covStore, prototypeGranule) => {

  // TODO: check pgConf or add defaults

  // code originally from Sauber project
  // cf. https://github.com/meggsimum/sauber-sdi-docker/blob/master/geoserver_publisher/index.js
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

  const zipPath = '/tmp/init_cog.zip';

  const zip = new AdmZip();
  zip.addFile(
    'datastore.properties',
    Buffer.from(dataStoreContent, "utf8")
  );
  zip.addFile(
    'indexer.properties',
    Buffer.from(indexerContent, "utf8")
  );
  zip.addFile(
    'timeregex.properties',
    Buffer.from(cogConfigFiles.timeregex, "utf8")
  );

  console.log(dataStoreContent);
  console.log(indexerContent);

  zip.writeZip(zipPath)

  log('Create image mosaic store via REST');
  const autoconfigure = false;
  await grc.datastores.createImageMosaicStore(ws, covStore, zipPath, autoconfigure);

  log(`... CoverageStore ${covStore} created`);

  log('Add sample granule');
  await grc.imagemosaics.addGranuleByRemoteFile(ws, covStore, prototypeGranule);

  log('Initialize the store');
  await grc.datastores.initCoverageStore(ws, covStore);

  // TODO: does not work yet
  log(`Enabling time for layer "${ws}:${covStore}"`);
  const presentation = 'LIST';
  const resolution = 3600000;
  const defaultValue = 'MAXIMUM';
  const nearestMatchEnabled = true;
  const rawNearestMatchEnabled = false;
  const acceptableInterval = 'PT1H';

  await grc.layers.enableTimeCoverage(ws, covStore, covStore, presentation, resolution, defaultValue, nearestMatchEnabled, rawNearestMatchEnabled, acceptableInterval );
  log(`Time dimension  for layer "${ws}:${covStore}" successfully enabled.`);

};
