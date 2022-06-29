/*
 * Script to publish SAUBER rasters as granules into the SAUBER SDI.
 *
 * @author C. Mayer, meggsimum
 */
// import fetch from 'node-fetch';
// import GeoServerRestClient from 'geoserver-node-client';
// import fs from 'fs';

import { initialize } from '../workerTemplate.js';
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

// const verbose = process.env.GSPUB_VERBOSE;

// TODO postgres credentials and table

// const postgRestUrl = process.env.GSPUB_PG_REST_URL || 'http://postgrest:3000';
// const postgRestUser = process.env.GSPUB_PG_REST_USER;
// const postgRestPw = dockerSecret.read('postgrest_password') || process.env.GSPUB_PG_REST_PW;

// const rasterMetaTable = process.env.GSPUB_RASTER_META_TBL || 'raster_metadata';

const geoserverUrl = process.env.GSPUB_GS_REST_URL || 'http://geoserver:8080/geoserver/rest/';
const geoserverUser = dockerSecret.read('geoserver_user') || process.env.GSPUB_GS_REST_USER;
const geoserverPw = dockerSecret.read('geoserver_password') || process.env.GSPUB_GS_REST_PW;

verboseLogging('GeoServer REST URL: ', geoserverUrl);
verboseLogging('GeoServer REST User:', geoserverUser);
verboseLogging('GeoServer REST PW:  ', geoserverPw);


/**
 * Checks if a GeoTIFF is valid.
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const publishImagemosaicLayer = async (workerJob, inputs) => {
  // TODO check steps from https://github.com/meggsimum/sauber-sdi-docker/blob/master/geoserver_publisher/index.js

}


// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, publishImagemosaicLayer);
