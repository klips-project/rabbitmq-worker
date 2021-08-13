import zlib from 'zlib';
import fs from 'fs';
import { initialize, log, errorAndExit } from '../workerTemplate.js';

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
const gunzipDownloadedFile = async(workerJob, inputs) => {
  const file = inputs[0];
  let chunks = [];
  let fileBuffer;
  let fileStream = fs.createReadStream(file);
  let fileName = file.replace(/.gz$/, '');

  log('Extracting ' + file + ' …');

  fileStream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  await new Promise((resolve, reject) => {
    fileStream.once('end', () => {
      fileBuffer = Buffer.concat(chunks);
      zlib.gunzip(fileBuffer, function (error, result) {
        if (error) {
          errorAndExit(error);
        }
        fs.writeFileSync(encodeURI(fileName), result.toString());
        log('The extract has finished.');
        resolve();
      });
    });
    fileStream.once('error', (err) => {
      errorAndExit(err);
      reject(err);
    })
  }).catch(errorAndExit);

  fileName = encodeURI(fileName);
  workerJob.status = 'success';
  workerJob.outputs = [fileName];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, gunzipDownloadedFile);
