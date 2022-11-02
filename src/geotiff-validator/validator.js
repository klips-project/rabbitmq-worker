import fs from 'fs';
import gdal from 'gdal-async';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';

import { transformExtent } from 'ol/proj.js';
import { boundingExtent, containsExtent } from 'ol/extent.js';

// TODO: remove/replace
import { debugLog } from '../workerTemplate.js';

// TODO: docs
class GeotiffValidator {
    // TODO: docs
    constructor(config) {
        this.config = config;
    }

    // TODO: docs
    async performValidation(filePath, validationSteps) {

        let dataset;

        // check if validationsteps include a GDAL based validator
        const requiresGdalvalidation = validationSteps.filter(step => [
            'projection',
            'extent',
            'datatype',
            'bands'
        ].includes(step)).length;

        if (requiresGdalvalidation) {
            try {
                dataset = await gdal.openAsync(filePath);
            } catch (error) {
                throw `Could not open dataset: ${error}`;
            }
        }

        // TODO: Register custom pro4 definitions dynamically: Maybe use ol-util ProjectionUtil
        // Check if allowedEPSGCodes contains EPSG:3035
        if (this.config.projection.allowedEPSGCodes.some(code => code === 3035)) {
            proj4.defs('EPSG:3035',
                '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
            register(proj4);
        }
        // Check if there are other EPSG codes allowed than 4326 or 3857 or 3035
        if (!this.config.projection.allowedEPSGCodes.every(code => (code === 4326 || code === 3857 || code === 3035))) {
            throw 'Other CRS than EPSG:4326, EPSG:3857, EPSG:3035 are currently not allowed.';
        }

        const validationResults = await Promise.all(validationSteps.map(async (step) => {
            switch (step) {
                case "fileSize":
                    return validateFilesize(
                        filePath, this.config.fileSize.minFileSize, this.config.fileSize.maxFileSize);
                case "projection":
                    return await validateProjection(dataset, this.config.projection.allowedEPSGCodes);
                case "extent":
                    return await validateExtent(dataset, boundingExtent(this.config.extent.allowedExtent));
                case "dataType":
                    return await validateDataType(dataset, this.config.dataType.allowedDataTypes);
                case "bands":
                    return await validateBands(dataset);
                default:
                    break;
            }
        }));

        return validationResults;
    }
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

    const result = {
        valid: false
    };

    if (valid) {
        result.valid = true;
    } else {
        result.info = `GeoTIFF file size is out of the allowed range: ${minimumFileSize} - ${maximumFileSize}.`
    }

    return result;
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedEPSGCodes List of allowed EPSG codes
 *
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateProjection = async (dataset, allowedEPSGCodes) => {
    const projectionCode = dataset?.srs?.getAuthorityCode();

    const result = {
        valid: false
    };

    if (allowedEPSGCodes.includes(parseInt(projectionCode))) {
        result.valid = true;
    }
    else {
        result.info = `Projection code EPSG:${projectionCode} is not supported.`;
    }
    return result;
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedExtent List of allowed EPSG codes
 *
 * @returns {Boolean} True, if GeoTIFF srs is supported
 */
const validateExtent = async (dataset, allowedExtent) => {
    const envenlope = dataset?.bands?.getEnvelope();
    let olExtent = boundingExtent([
        [envenlope.minX, envenlope.minY],
        [envenlope.maxX, envenlope.maxY]
    ]);
    const projectionCode = dataset?.srs?.getAuthorityCode();

    const result = {
        valid: false
    };

    // TODO: make allowed projection codes a global constant
    if (!["4326", "3857", "3035"].includes(projectionCode)) {
        result.info(`Projection code '${projectionCode}' is not allowed`);
        return result;
    }

    // transform extent to EPSG:4326
    if (projectionCode !== "4326") {
        olExtent = transformExtent(olExtent, `EPSG:${projectionCode}`, "EPSG:4326");
    }

    if (containsExtent(allowedExtent, olExtent)) {
        result.valid = true;
    } else {
        result.info = `Invalid extent: [${olExtent.toString()}]. Should be in [${allowedExtent.toString()}]`;
    }
    return result;
}

/**
 * Checks if a GeoTIFF has an allowed datatype.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedDataTypes Allowed datatypes
 *
 * @returns {Boolean} True, if GeoTIFF datatype is supported
 */
const validateDataType = async (dataset, allowedDataTypes) => {
    const dataType = dataset?.bands?.get(1)?.dataType;

    const result = {
        valid: false
    };

    if (allowedDataTypes.includes(dataType)) {
        result.valid = true;
    } else {
        result.info = `Datatype: '${dataType}' is not supported.`;
    }

    return result;
}

/**
 * Checks if a GeoTIFF has a minimum number of bands.
 * TODO: Enhance this test or check if it is necessary.
 *
 * @param {Object} dataset GDAL dataset
 *
 * @returns {Boolean} True, if GeoTIFF has minimum number of bands
 */
const validateBands = async (dataset) => {
    const countBands = dataset?.bands?.count();

    debugLog(`GeoTiff has ${countBands} band(s).`);

    const result = {
        valid: false
    };

    if (countBands > 0) {
        result.valid = true;
    }
    else {
        result.info = `GeoTIFF has ${countBands} number of bands`;
    }
    return result;
}

export { GeotiffValidator, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection };
