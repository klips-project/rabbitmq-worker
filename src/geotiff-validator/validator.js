import fs from 'fs';
import { debugLog } from '../workerTemplate.js';
import { transformExtent } from 'ol/proj.js';
import { boundingExtent, containsExtent } from 'ol/extent.js';

const validateGeoTiff = async () => {

}

/**
 * Checks if the size of a GeoTIFF is in a defined range.
 *
 * @param {String} filePath Path to a GeoTIFF file
 * @param {Number} minimumFileSize The minimum file size in bytes
 * @param {Number} maximumFileSize The maximum file size in bytes
 *
 * @returns {Boolean} True, if GeoTIFF is greater than the minimum file size
 */
const validateFilesize = (filePath, minimumFileSize, maximumFileSize) => {
    let stats = fs.statSync(filePath);
    const valid = stats.size && stats.size > minimumFileSize && stats.size < maximumFileSize;

    if (valid) {
        debugLog(`FileSize of GeoTIFF is valid.`);
        return true;
    } else {
        debugLog(`GeoTIFF file size is out of the allowed range: ${minimumFileSize} - ${maximumFileSize}.`);
        throw 'GeoTIFF has invalid file size.';
    }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedEPSGCodes List of allowed EPSG codes
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateProjection = async (dataset, allowedEPSGCodes) => {
    const projectionCode = dataset?.srs?.getAuthorityCode();

    if (allowedEPSGCodes.includes(parseInt(projectionCode))) {
        debugLog(`Projection code of GeoTiff EPSG:${projectionCode} is valid.`);
        return true;
    }
    else {
        throw `Projection code EPSG:${projectionCode} is not supported.`;
    }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedExtent List of allowed EPSG codes
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateExtent = async (dataset, allowedExtent) => {
    const envenlope = dataset?.bands?.getEnvelope();
    let olExtent = boundingExtent([
        [envenlope.minX, envenlope.minY],
        [envenlope.maxX, envenlope.maxY]
    ]);
    const projectionCode = dataset?.srs?.getAuthorityCode();

    // TODO: make allowed projection codes a global constant
    if (!["4326", "3857", "3035"].includes(projectionCode)) {
        throw `Projection code '${projectionCode}' is not allowed`;
    }

    if (projectionCode !== "4326") {
        olExtent = transformExtent(olExtent, `EPSG:${projectionCode}`, "EPSG:4326");
    }

    if (containsExtent(allowedExtent, olExtent)) {
        debugLog(`Extent of GeoTiff: ${olExtent} is valid.`);
        return true;
    }
    else {
        throw `Invalid extent: [${olExtent.toString()}]. Should be in [${allowedExtent.toString()}]`;
    }
}

/**
 * Checks if a GeoTIFF has an allowed datatype.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedDataTypes Allowed datatypes
 * @returns {Boolean} True, if GeoTIFF datatype is supported
 */
const validateDataType = async (dataset, allowedDataTypes) => {
    const dataType = dataset?.bands?.get(1)?.dataType;

    if (allowedDataTypes.includes(dataType)) {
        debugLog(`Datatype of GeoTiff "${dataType}" is valid.`);
        return true;
    }
    else {
        throw `Datatype: '${dataType}' is not supported.`;
    }
}

/**
 * Checks if a GeoTIFF has a minimum number of bands.
 * TODO: Enhance this test or check if it is necessary.
 *
 * @param {Object} dataset GDAL dataset
 * @returns {Boolean} True, if GeoTIFF has minimum number of bands
 */
const validateBands = async (dataset) => {
    const countBands = dataset?.bands?.count();

    debugLog(`GeoTiff has ${countBands} band(s).`);

    if (countBands > 0) {
        return true;
    }
    else {
        throw `GeoTIFF has an invalid number of bands.`;
    }
}

export { validateGeoTiff, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection };
