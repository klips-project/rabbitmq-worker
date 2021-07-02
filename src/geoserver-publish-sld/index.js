import GeoServerRestClient from 'geoserver-node-client/geoserver-rest-client.js';
import { log, initialize, errorAndExit } from '../workerTemplate.js';

const url = process.env.GSHOST;
const user = process.env.GSUSER;
const pw = process.env.GSPASS;
const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const grc = new GeoServerRestClient(url, user, pw);

/**
 * Publishes a SLD in GeoServer
 * Modifies the given job object in place with status.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input has to be the stringified sldBody
 *   Second input is the name that should be used for publishing the SLD
 *   Third input is the workspace the SLD should be created in.
 *   Workspace will get created if it does not exist
 * @example
 *   {
       "type": "geoserver-publish-sld",
       "inputs": [
         "<?xml version='1.0' encoding='UTF-8'?><StyledLayerDescriptor version='1.0.0'  xsi:schemaLocation='http://www.opengis.net/sld StyledLayerDescriptor.xsd'  xmlns='http://www.opengis.net/sld'  xmlns:ogc='http://www.opengis.net/ogc'  xmlns:xlink='http://www.w3.org/1999/xlink'  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'> <NamedLayer> <Name>default_line</Name> <UserStyle> <Title>Default Line</Title> <Abstract>A sample style that draws a line</Abstract> <FeatureTypeStyle> <Rule> <Name>rule1</Name> <Title>Blue Line</Title> <Abstract>A solid blue line with a 1 pixel width</Abstract> <LineSymbolizer> <Stroke> <CssParameter name='stroke'>#0000FF</CssParameter> </Stroke> </LineSymbolizer> </Rule> </FeatureTypeStyle> </UserStyle> </NamedLayer></StyledLayerDescriptor>",
         "simplePointStyle",
         "defaultWorkspace"
       ]
     }
 */
const geoserverPublishSLD = async(workerJob, inputs) => {
  const sldBody = inputs[0];
  const sldName = inputs[1];
  const sldWorkspace = inputs[2];

  log('Checking GeoServer connectivity …')
  const gsExists = await grc.exists();
  if (!gsExists) {
    errorAndExit('GeoServer not found');
  }
  const workspaceExists = await grc.workspaces.get(sldWorkspace);
  if (!workspaceExists) {
    log('Workspace does not exist, creating …');
    const workspaceCreated = grc.workspaces.create(sldWorkspace);
    if (!workspaceCreated) {
      errorAndExit('Could not create workspace');
    } else {
      log('Workspace created');
    }
  }

  const styleExists = await grc.styles.getStyleInformation(sldName, sldWorkspace);
  if (styleExists) {
    errorAndExit('Style already exists, cancelling …');
  }

  const created = await grc.styles.publish(sldWorkspace, sldName, sldBody);
  if (created) {
    log('Succesfully published SLD');
  } else {
    errorAndExit('Could not publish SLD');
  }
  
  log('GeoServer worker finished');

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, workerQueue, resultQueue, geoserverPublishSLD);
