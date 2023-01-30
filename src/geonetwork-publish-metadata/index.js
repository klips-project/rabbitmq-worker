import GeoNetworkClient from '../gnos-client.js';
import logger from './child-logger.js';
import { initialize } from '../workerTemplate.js';

const url = process.env.GNHOST;
const user = process.env.GNUSER;
const pw = process.env.GNPASS;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const gnos = new GeoNetworkClient(url, user, pw);

/**
 * Publishes a Metadataset in GeoNetwork
 * Modifies the given job object in place with status.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First mandatory input has to be the stringified metadata XML
 *   Second optional parameter is the string "CREATE" (default) or "UPDATE".
 *     In the latter case the existing dataset will be updated, identified
 *     by the uuid given in the metadata XML
 * @example
 *   {
       "type": "geonetwork-publish-metadata",
       "inputs": [
         "<?xml version='1.0' encoding='UTF-8'?><gmd:MD_Metadata xmlns:gmd='http://www.isotc211.org/2005/gmd'/>",
         "UPDATE"
       ]
     }
 */
const geonetworkPublishMetadata = async(workerJob, inputs) => {
  const metadataXml = inputs[0];
  const mode = inputs[1] || 'CREATE';

  logger.debug('Checking GeoNetwork connectivity …')
  const gnExists = await gnos.exists();
  if (!gnExists) {
    throw 'GeoNetwork not found';
  }

  const uuid = await gnos.publish(metadataXml, mode);
  if (uuid) {
    logger.debug('Succesfully published Metadata');
  } else {
    throw 'Could not publish Metadata';
  }

  logger.debug('GeoNetwork worker finished');

  workerJob.status = 'success';
  workerJob.outputs = [uuid];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, geonetworkPublishMetadata);
