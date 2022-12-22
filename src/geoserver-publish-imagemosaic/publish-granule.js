import fsPromises from 'fs/promises';
import path from 'path';
import { log } from '../workerTemplate.js';

// TODO
export const publishClassicGranule = async (grc, ws, covStore, coverageToAdd, replaceExistingGranule, geoserverDataDir) => {

  const fileName = path.basename(coverageToAdd);
  const newPath = path.join(geoserverDataDir, 'data', ws, covStore, fileName);

  // Move GeoTiff
  await fsPromises.rename(coverageToAdd, newPath);

  // Check if granule already exists
  const granuleAlreadyExists = await grc.imagemosaics.doesGranuleExist(ws, covStore, covStore, newPath);

  if (granuleAlreadyExists && !replaceExistingGranule) {
    throw 'Granule with this timestamp already exists.';
  }

  await grc.imagemosaics.addGranuleByServerFile(
    ws, covStore, newPath
  );
  log('Successfully added new granule to coverage store.');
  return newPath;
};

// TODO
export const publishCogGranule = async (grc, ws, covStore, coverageToAdd, replaceExistingGranule) => {

  const granuleAlreadyExists = await grc.imagemosaics.doesGranuleExist(ws, covStore, covStore, coverageToAdd);

  if (granuleAlreadyExists && !replaceExistingGranule) {
    throw 'Granule with this timestamp already exists.';
  }

  log('Debug')
  await grc.imagemosaics.addGranuleByRemoteFile(
    ws, covStore, coverageToAdd
  );

  const granuleRecognisedByGeoServer = await grc.imagemosaics.doesGranuleExist(ws, covStore, covStore, coverageToAdd);


  if (!granuleRecognisedByGeoServer) {
    throw `GeoServer could not locate provided COG granule URL: ${coverageToAdd}`
  }

  log(`exits ${granuleRecognisedByGeoServer}`)
  log('Successfully added new granule to coverage store.');
}
