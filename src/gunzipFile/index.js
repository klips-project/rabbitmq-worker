#!/usr/bin/env node

const zlib = require('zlib');
const fs = require('fs');

const worker = require('../workerTemplate');
const workerQueue = 'extract';
const resultQueue = 'results';
const rabbitHost = 'amqp://rabbitmq';

/**
 * Extracts a given `*.gz` file.
 * Modifies the given job object in place with status and results.
 * @param {Object} workerJob The job object containing the fileURI to extract 
 */
const gunzipDownloadedFile = async(workerJob) => {
  const file = workerJob.fileURI;
  let chunks = [];
  let fileBuffer;
  let fileStream = fs.createReadStream(file);
  let fileName = file.replace(/.gz$/, '');

  worker.log('Extracting ' + file + ' …');

  fileStream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  await new Promise((resolve, reject) => {
    fileStream.once('end', () => {
      fileBuffer = Buffer.concat(chunks);
      zlib.gunzip(fileBuffer, function (error, result) {
        if (error) {
          worker.errorAndExit(error);
        }
        fs.writeFileSync(encodeURI(fileName), result.toString());
        worker.log('The extract has finished.');
        resolve();
      });
    });
    fileStream.once('error', (err) => {
      worker.errorAndExit(err);
      reject(err);
    })
  }).catch(worker.errorAndExit);

  fileName = encodeURI(fileName);
  workerJob.status = 'success';
  workerJob.extractedFile = fileName;
};

// Initialize and start the worker process
worker.initialize(rabbitHost, workerQueue, resultQueue, gunzipDownloadedFile);
