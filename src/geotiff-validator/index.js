import assert from 'assert';
import fs from 'fs';

import gdal from 'gdal-async';

import { boundingExtent, containsExtent } from 'ol/extent.js';

import { initialize, log } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

const allowedEPSGCodes = [
  "4326",
  "3857"
];

const allowedExtent = boundingExtent([
  [
    5.85,
    47.27,
  ],
  [
    15.02,
    55.07
  ]
]);

// TODO define allowed datatypes, cf. https://gdal.org/user/raster_data_model.html
const allowedDataTypes = [
  'Byte',
  'Int16',
  'Float32'
]

/**
 * Checks if a GeoTIFF is valid
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const validateGeoTiff = async (workerJob, inputs) => {
  const filePath = inputs[0];
  // define fallback validation step if nothing is defined in input arguments
  const validationSteps = inputs[1] && inputs[1].validationSteps ? inputs[1].validationSteps : ['filesize'];
  let dataset;

  // check if validationsteps include a GDAL based validator
  if (validationSteps.filter(step => [
      'projection',
      'extent',
      'datatype',
      'bands'
    ].includes(step)).length) {
      try {
        dataset = await gdal.openAsync(filePath);
      } catch (error) {
        throw `Could not open dataset: $error`;
      }
  }

  const validationResults = await Promise.all(validationSteps.map(async (step) => {
    let testResult;
    switch (step) {
      case "filesize":
        testResult = validateFilesize(filePath);
        return testResult;
      case "projection":
        testResult = await validateProjection(dataset, allowedEPSGCodes);
        return testResult;
      case "extent":
        testResult = await validateExtent(dataset, allowedExtent);
        return testResult;
      case "datatype":
        testResult = await validateDataType(dataset, allowedDataTypes);
        return testResult;
      case "bands":
        testResult = await validateBands(dataset);
        return testResult;
      default:
        break;
    }
  }));

  if (validationResults.every(result => result)) {
    log('GeoTiff is valid.');
    workerJob.status = 'success';
    workerJob.outputs = [filePath];
  } else {
    throw 'GeoTIFF is invalid.';
  }

}

/**
 * Checks if a GeoTIFF has a minimum file size.
 *
 * @param {String} filePath Path to a GeoTIFF file
 * @param {Number} minimumFileSize The minimum file size in bytes
 * @returns Boolean True, if GeoTIFF is greater than the minimum file size
 */
const validateFilesize = (filePath, minimumFileSize = 1000) => {
  let stats = fs.statSync(filePath);
  assert(stats.size);

  const valid = stats.size > minimumFileSize;

  if (valid) {
    return true;
  } else {
    log(`GeoTIFF file size is below the defined minium file size of ${minimumFileSize}.`);
    throw 'GeoTIFF has invalid file size.';
  }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} List of allowed EPSG codes
 * @returns Boolean True, if GeoTIFF srs is supported
 */
const validateProjection = async (dataset, allowedEPSGCodes) => {
  const projectionCode = dataset?.srs?.getAuthorityCode();
  log(`Projection Code of GeoTiff: ${projectionCode}`);

  if (allowedEPSGCodes.includes(projectionCode)) {
    return true;
  }
  else {
    throw `Projection code EPSG:${projectionCode} currently not supported.`;
  }
}

/**
 * Checks if a GeoTIFF has an allowed projection.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} List of allowed EPSG codes
 * @returns Boolean True, if GeoTIFF srs is supported
 */
const validateExtent = async (dataset, allowedExtent) => {
  const envenlope = dataset?.bands?.getEnvelope();
  // compose ol extent
  const olExtent = boundingExtent([
    [envenlope.minX, envenlope.minY],
    [envenlope.maxX, envenlope.maxY]
  ]);

  log(`Extent of GeoTiff: ${olExtent}`);

  if (containsExtent(allowedExtent, olExtent)) {
    return true;
  }
  else {
    throw `Invalid extent: ${olExtent.toString()}.`;
  }
}

/**
 * Checks if a GeoTIFF has an allowed datatype.
 *
 * @param {Object} dataset GDAL dataset
 * @param {Array} Allowed datatypes
 * @returns Boolean True, if GeoTIFF datatype is supported
 */
const validateDataType = async (dataset, allowedDataTypes) => {
  const dataType = dataset?.bands?.get(1)?.dataType;

  log(`Datatype of GeoTiff: ${dataType}`);

  if (allowedDataTypes.includes(dataType)) {
    return true;
  }
  else {
    throw `Datatype :${dataType} currently not supported.`;
  }
}

/**
 * Checks if a GeoTIFF has a minimum number of bands.
 * TODO Enhance this test or check if it is necessary.
 *
 * @param {Object} dataset GDAL dataset
 * @returns Boolean True, if GeoTIFF has minimum number of bands
 */
const validateBands = async (dataset) => {
  const countBands = dataset?.bands?.count();

  log(`GeoTiff has ${countBands} band(s).`);

  if (countBands > 0) {
    return true;
  }
  else {
    throw `GeoTIFF has an invalid number of bands.`;
  }
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
