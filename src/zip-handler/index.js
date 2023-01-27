import fs from 'fs';
import fsPromises from 'fs/promises';
import archiver from 'archiver';
import unzip from 'unzipper';
import path from 'path';

import { initialize } from '../workerTemplate.js';
import { logger } from '../logger.js';


const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Worker that extracts or compresses zipfiles.
 * First input defines if we shall extract by supplying "extract" as string.
 * Second input is the path where files should be compressed or extracted.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @returns {Object} The workerJob containing the result as output
 * @example
 *
    {
      "id": 3,
      "type": "zip-handler",
      "inputs": ["extract", "/path/to/zipfile.zip"],
    }
 */
const zipHandler = async (workerJob, inputs) => {
  if (inputs[0] === 'extract') {
    await unzipFiles(workerJob, inputs);
  } else {
    await zipFiles(workerJob, inputs);
  }
}

/**
 * Creates a zip file for the given folder
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @returns {Object} The workerJob containing the path of the zip as output
 */
const zipFiles = async (workerJob, inputs) => {
  logger.debug('Creating a zip file …');

  const folder = inputs[1];
  const fileName = new Date() * 1 + '.zip';
  const tempFilePath = folder + '/../' + fileName;
  const finalFilePath = folder + '/' + fileName;
  const output = fs.createWriteStream(tempFilePath);
  const zip = archiver('zip');

  zip.on('error', (e) => { throw e });
  zip.pipe(output);
  zip.directory(folder, false);
  zip.finalize();

  await writeAsync(output);
  logger.debug('Zipfile created');
  await fsPromises.rename(tempFilePath, finalFilePath);
  logger.debug('Zipfile moved to final destination');

  workerJob.status = 'success';
  workerJob.outputs = [finalFilePath];
};

/**
 * Unzips a zip file for the given path
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @returns {Object} The workerJob containing the path to the unzipped files as output
 */
const unzipFiles = async (workerJob, inputs) => {
  logger.debug('Uncompressing a zip file …');

  const file = inputs[1];
  const dir = path.dirname(file) + new Date() * 1;

  const content = await unzip.Open.file(file);
  await content.extract({ path: dir, concurrency: 5 });

  workerJob.status = 'success';
  workerJob.outputs = [dir];
};

const writeAsync = (output) => {
  return new Promise(function (resolve, reject) {
    output.on('close', resolve);
    output.on('error', reject);
  });
}

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, zipHandler);
