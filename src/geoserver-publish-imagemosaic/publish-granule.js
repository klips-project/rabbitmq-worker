import fsPromises from 'fs/promises';
import path from 'path';

/**
 * Add a COG to the image mosaic store by using its URL.
 *
 * @param {Object} grc An instance of the GeoServer REST client
 * @param {string} ws The name of the workspace
 * @param {string} covStore The name of the coverage store
 * @param {string} coverageToAdd The URL of the coverage to add
 * @param {string} replaceExistingGranule If the existing granule shall be replaced
 */
export const publishCogGranule = async (grc, ws, covStore, coverageToAdd, replaceExistingGranule) => {

  const granuleAlreadyExists = await grc.imagemosaics.doesGranuleExist(ws, covStore, covStore, coverageToAdd);

  if (granuleAlreadyExists && !replaceExistingGranule) {
    throw 'Granule with this timestamp already exists.';
  }

  await grc.imagemosaics.addGranuleByRemoteFile(
    ws, covStore, coverageToAdd
  );

  const granuleRecognisedByGeoServer = await grc.imagemosaics.doesGranuleExist(ws, covStore, covStore, coverageToAdd);


  if (!granuleRecognisedByGeoServer) {
    throw `GeoServer could not locate provided COG granule URL: ${coverageToAdd}`
  }
}

/**
 * Add a GeoTIFF to the image mosaic store by using its filepath.
 *
 * WARNING: This function is currently not used and might need adaptation.
 *
 * @param {Object} grc An instance of the GeoServer REST client
 * @param {string} ws The name of the workspace
 * @param {string} covStore The name of the coverage store
 * @param {string} coverageToAdd The path of the coverage to add
 * @param {string} replaceExistingGranule If the existing granule shall be replaced
 * @param {string} geoserverDataDir The path of the GeoServer data directory
 *
 * @returns {string} newPath The new path of the GeoTIFF
 */
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
  return newPath;
};
