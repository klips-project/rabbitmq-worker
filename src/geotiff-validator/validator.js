import fs from 'fs';
import gdal from 'gdal-async';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';

import { transformExtent } from 'ol/proj.js';
import { boundingExtent, containsExtent } from 'ol/extent.js';

const PROJECTION_NAME = 'projection';
const EXTENT_NAME = 'extent';
const DATATYPE_NAME = 'dataType';
const BAND_NAME = 'bands';
const FILESIZE_NAME = 'fileSize';

const ALLOWED_PROJECTIONS = ["4326", "3857", "3035"];

/** Class for a GeoTIFF validator */
class GeotiffValidator {
    /**
     * Create a GeotTIFF validator
     *
     * @param {Object} config The configuration object
     *
     * NOTE: the projection for "allowedExtent" is always "EPSG:4326"
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Validates a GeoTIFF.
     *
     * @param {String} filePath The path of the GeoTIFF to validate
     * @param {String[]} validationSteps The names of the validation steps to perform
     *
     * @returns {Object[]} An array with result objects
     */
    async performValidation(filePath, validationSteps) {

        let dataset;

        // check if validationsteps include a GDAL based validator
        const requiresGdalvalidation = validationSteps.filter(step => [
            PROJECTION_NAME,
            EXTENT_NAME,
            DATATYPE_NAME,
            BAND_NAME
        ].includes(step)).length;

        if (requiresGdalvalidation) {
            try {
                dataset = await gdal.openAsync(filePath);
            } catch (error) {
                throw `Could not open dataset: ${error}`;
            }
        }

        // TODO: Register custom proj4 definitions dynamically: Maybe use ol-util ProjectionUtil
        // Check if allowedEPSGCodes contains EPSG:3035
        if (this.config.projection.allowedEPSGCodes.some(code => code === 3035)) {
            proj4.defs('EPSG:3035',
                '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
            register(proj4);
        }
        // Check if there are other EPSG codes allowed than 4326 or 3857 or 3035
        if (this.config.projection.allowedEPSGCodes.every(
            epsgCode => ALLOWED_PROJECTIONS.includes(epsgCode)
        )) {
            throw 'Some of the provided projections are not supported.'
        }

        const validationResults = await Promise.all(validationSteps.map(async (step) => {
            switch (step) {
                case FILESIZE_NAME:
                    return validateFilesize(
                        filePath, this.config.fileSize.minFileSize, this.config.fileSize.maxFileSize);
                case PROJECTION_NAME:
                    return await validateProjection(dataset, this.config.projection.allowedEPSGCodes);
                case EXTENT_NAME:
                    return await validateExtent(dataset, boundingExtent(this.config.extent.allowedExtent));
                case DATATYPE_NAME:
                    return await validateDataType(dataset, this.config.dataType.allowedDataTypes);
                case BAND_NAME:
                    return await validateBands(dataset, this.config.bands.expectedCount);
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
 * @returns {Object} result The result object of the validation
 * @returns {String} result.type The name of the validation
 * @returns {Boolean} result.valid If the size of a GeoTIFF is in a defined range
 * @returns {String} [result.info] Additional information if validation was not succesful
 */
const validateFilesize = (filePath, minimumFileSize, maximumFileSize) => {
    const configValid = Number.isInteger(minimumFileSize) && Number.isInteger(maximumFileSize);
    if (!configValid) {
        throw 'Both values for minimum and maximum filesize must be integer';
    }

    let stats = fs.statSync(filePath);
    const valid = stats.size && stats.size > minimumFileSize && stats.size < maximumFileSize;

    const result = {
        type: FILESIZE_NAME,
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
 * @param {Number[]} allowedEPSGCodes List of allowed EPSG codes
 *
 * @returns {Object} result The result object of the validation
 * @returns {String} result.type The name of the validation
 * @returns {Boolean} result.valid If projection is supported
 * @returns {String} [result.info] Additional information if validation was not succesful
 */
const validateProjection = async (dataset, allowedEPSGCodes) => {
    const configValid = !!allowedEPSGCodes && Array.isArray(allowedEPSGCodes) && allowedEPSGCodes.length !== 0 && !allowedEPSGCodes.some(code => isNaN(code));
    if (!configValid) {
        throw 'Value for allowed EPSG codes must be an Array with numbers';
    }

    const projectionCode = dataset?.srs?.getAuthorityCode();

    const result = {
        type: PROJECTION_NAME,
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
 * Checks if GeoTIFF is within expected extent.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} allowedExtent The allowed extent in EPSG:4326 provided in OpenLayers format. Example: [minX, minY, maxX, maxY]
 *
 * @returns {Object} result The result object of the validation
 * @returns {String} result.type The name of the validation
 * @returns {Boolean} result.valid If GeoTIFF is within expected extent
 * @returns {String} [result.info] Additional information if validation was not succesful
 */
const validateExtent = async (dataset, allowedExtent) => {
    const configValid = Array.isArray(allowedExtent) && allowedExtent.length === 4;

    if (!configValid) {
        throw 'Provided BBOX for checking extent is not valid';
    }

    const envenlope = dataset?.bands?.getEnvelope();
    let olExtent = boundingExtent([
        [envenlope.minX, envenlope.minY],
        [envenlope.maxX, envenlope.maxY]
    ]);
    const projectionCode = dataset?.srs?.getAuthorityCode();

    const result = {
        type: EXTENT_NAME,
        valid: false
    };

    if (!ALLOWED_PROJECTIONS.includes(projectionCode)) {
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
 * @returns {Object} result The result object of the validation
 * @returns {String} result.type The name of the validation
 * @returns {Boolean} result.valid If GeoTIFF has allowed datatype
 * @returns {String} [result.info] Additional information if validation was not succesful
 */
const validateDataType = async (dataset, allowedDataTypes) => {
    const configValid = Array.isArray(allowedDataTypes) && allowedDataTypes.length > 0;
    if (!configValid) {
        throw 'Value for the provided datatypes is not valid.'
    }

    const dataType = dataset?.bands?.get(1)?.dataType;

    const result = {
        type: DATATYPE_NAME,
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
 * Checks if a GeoTIFF has the expected count of bands.
 *
 * @param {Object} dataset GDAL dataset
 *
 * @returns {Object} result The result object of the validation
 * @returns {String} result.type The name of the validation
 * @returns {Boolean} result.valid If count of bands equal expected count
 * @returns {String} [result.info] Additional information if validation was not succesful
 */
const validateBands = async (dataset, expectedCountOfBands) => {
    const countBands = dataset?.bands?.count();

    const result = {
        type: BAND_NAME,
        valid: false
    };

    if (countBands === expectedCountOfBands) {
        result.valid = true;
    }
    else {
        result.info = `Invalid count of bands. Expected: ${expectedCountOfBands}. Actual: ${countBands}`;
    }
    return result;
}

export { GeotiffValidator, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection };
