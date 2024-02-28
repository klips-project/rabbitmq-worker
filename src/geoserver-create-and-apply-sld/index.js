import {GeoServerRestClient} from 'geoserver-node-client';
import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import pg from 'pg';
const { Client } = pg;
import { exec } from 'child_process';

const url = process.env.GEOSERVER_REST_URL;
const user = process.env.GEOSERVER_USER;
const pw = process.env.GEOSERVER_PASSWORD;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const pgpasswd = process.env.POSTGRES_PASSWORD;
const pghost = process.env.POSTGRES_HOST;
const pgport = process.env.POSTGRES_PORT;
const pguser = process.env.POSTGRES_USER;
const pgdb = process.env.POSTGRES_DB;
const grc = new GeoServerRestClient(url, user, pw);

/**
 * Creates and publishes SLD with colorramp matching the time enabled datasets min and max values.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the name that should be used for publishing the SLD
 *   Second input is the workspace the SLD should be created in.
 *   Third is the table name of the coveragestore
 * @example
 *   {
       "type": "geoserver-create-and-apply-sld",
       "inputs": [
         "myCustomStyleName",
         "mySldWorkspace",
         "myCoverageDbTable",
         "myBand"
       ]
     }
 */
const geoServerCreateAndApplySld = async (workerJob, inputs) => {
  const sldName = inputs[0];
  const sldWorkspace = inputs[1];
  const dbTable = inputs[2];
  const band = inputs[3];

  logger.debug('Checking GeoServer connectivity …')
  const gsExists = await grc.about.exists();
  if (!gsExists) {
    throw 'GeoServer not found';
  }
  const workspaceExists = await grc.workspaces.get(sldWorkspace);
  if (!workspaceExists) {
    logger.debug('Workspace does not exist, creating …');
    const workspaceCreated = grc.workspaces.create(sldWorkspace);
    if (!workspaceCreated) {
      throw 'Could not create workspace';
    } else {
      logger.debug('Workspace created');
    }
  }

  let pgClient;
  let locations = [];
  try {
    pgClient = new Client({
      host: pghost,
      port: pgport,
      database: pgdb,
      user: pguser,
      password: pgpasswd,
    });
    await pgClient.connect();

    const sqlQuery = `SELECT location FROM "${dbTable}"`;
    const res = await pgClient.query(sqlQuery);
    
    locations = res.rows.map(row => row.location);
    logger.debug("Locations found for coveragestore: " + locations);
  } catch (e) {
    logger.error(e);
    throw 'SQL execution aborted: ' + e;
  } finally {
    if (pgClient) {
      await pgClient.end();   
    }
  }

  let min = 0;
  let max = 0;
  // for every dataset in the coveragestore, get min and max statistics and compute total min and max
  for (let i = 0; i < locations.length; i++) {
    const infoCmd = `gdalinfo -mm ${locations[i]} | grep "Band ${band}" -A1 | grep "Computed Min/Max"`;
    try {
      const response = await execShellCommand(infoCmd);
      logger.debug('gdal response: ' + response);
      if (response && response.indexOf('Min/Max=' > -1)) {
        // TODO: make failsafe
        const currentMin = parseInt(response.split('=')[1].split(',')[0].trim());
        const currentMax = parseInt(response.split('=')[1].split(',')[1].trim());

        // on first iteration, we need to set the values unconditionally as starting point
        if (i === 0) {
          min = currentMin;
          max = currentMax;
        } else {
          if (currentMin < min) {
            min = currentMin;
          }
          if (currentMax > max) {
            max = currentMax;
          }
        }
      } else {
        continue;
      }
    } catch (e) {
      throw 'GDAL Info execution aborted: ' + e;
    }
  }
  // apply default color ramp if no values detected
  if (min === 0 && max === 0) {
    min = -20;
    max = 50;
  }

  // as parseInt removes decimals, we add a full integer
  max = max + 1;

  logger.debug("Calculated min and max values for whole dataset: " + min + ", " + max);

  const sldBody = sldTemplate(min, max);
  logger.debug("Generated SLD: " + sldBody);

  // we have to delete the old style first as publish can not override existing styles
  try {
    const recurese = true
    const purge = true;
    await grc.styles.delete(sldWorkspace, sldName, recurese, purge);
    logger.debug('Succesfully deleted previous SLD');
  } catch {
    logger.error('Could not delete old SLD');
  }

  try {
    await grc.styles.publish(sldWorkspace, sldName, sldBody);
    logger.debug('Succesfully published SLD');
  } catch {
    throw('Could not publish SLD');
  }

  logger.debug('GeoServer worker finished');

  workerJob.status = 'success';
  workerJob.outputs = [];
};

const sldTemplate = (minValue, maxValue) => {
  const range = maxValue - minValue;
  const step = Math.round(range / 5);
  return `<?xml version="1.0" encoding="UTF-8"?>
    <sld:StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:sld="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0">
      <sld:NamedLayer>
          <sld:Name>Custom Color Ramp</sld:Name>
          <sld:UserStyle>
            <sld:Name>Custom Color Ramp</sld:Name>
            <sld:FeatureTypeStyle>
              <sld:Rule>
                <sld:RasterSymbolizer>
                  <sld:ChannelSelection>
                    <sld:GrayChannel>
                      <sld:SourceChannelName>1</sld:SourceChannelName>
                    </sld:GrayChannel>
                  </sld:ChannelSelection>
                <sld:ColorMap type="ramp">
                  <sld:ColorMapEntry color="#000000" quantity="${minValue}" label="  ${minValue}"/>
                  <sld:ColorMapEntry color="#3a3a3a" quantity="${minValue  + step}" label="  ${minValue + step}"/>
                  <sld:ColorMapEntry color="#6a6a6a" quantity="${minValue + 2 * step}" label="  ${minValue + 2 * step}"/>
                  <sld:ColorMapEntry color="#9a9a9a" quantity="${minValue + 3 * step}" label="  ${minValue + 3 * step}"/>
                  <sld:ColorMapEntry color="#cacaca" quantity="${minValue + 4 * step}" label="  ${minValue + 4 * step}"/>
                  <sld:ColorMapEntry color="#ffffff" quantity="${maxValue}" label="  ${maxValue}"/>
                </sld:ColorMap>
              </sld:RasterSymbolizer>
            </sld:Rule>
          </sld:FeatureTypeStyle>
        </sld:UserStyle>
      </sld:NamedLayer>
    </sld:StyledLayerDescriptor>`;
}

/**
 * Executes a shell command and return it as a Promise.
 * Kudos to https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 *
 * @param cmd {String} The command to execute
 * @return {Promise<String>} A Promise returning the console output
 */
const execShellCommand = (cmd) => {
  return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
          if (error) {
              logger.warn(error);
              reject(error);
          }
          resolve(stdout ? stdout : stderr);
      });
  });
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geoServerCreateAndApplySld);
