import zlib from 'zlib';
import fs from 'fs';
import { initialize } from '../workerTemplate.js';
import { logger } from '../logger.js';


const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

/**
 * Extracts a given `*.gz` file.
 * Modifies the given job object in place with status and results.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 */
const gunzipDownloadedFile = async (workerJob, inputs) => {
  const file = inputs[0];
  let chunks = [];
  let fileBuffer;
  let fileStream = fs.createReadStream(file);
  let fileName = file.replace(/.gz$/, '');

  logger.debug('Extracting ' + file + ' …');

  fileStream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  return new Promise((resolve, reject) => {
    fileStream.once('end', () => {
      fileBuffer = Buffer.concat(chunks);
      zlib.gunzip(fileBuffer, function (error, result) {
        if (error) {
          reject(error);
        }
        fs.writeFileSync(encodeURI(fileName), result.toString());
        logger.debug('The extract has finished.');
        fileName = encodeURI(fileName);
        workerJob.status = 'success';
        workerJob.outputs = [fileName];
        resolve();
      });
    });
    fileStream.once('error', (err) => {
      reject(err);
    })
  });
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, gunzipDownloadedFile);
