#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const request = require('request');

const worker = require('../workerTemplate');
const dir = '/home/data';
const workerQueue = 'download';
const resultQueue = 'results';
const rabbitHost = 'amqp://rabbitmq';

/**
 * Downloads data for the given URL.
 * Modifies the given job object in place with status and results.
 * @param {Object} workerJob The job object containing the URL to download 
 */
const downloadNewDataFromURL = async(workerJob) => {
  const uri = workerJob.datasetURI;
  const url = new URL(uri);
  const basename = path.basename(url.pathname);
  const pathName = path.join(dir, encodeURI(basename));
  const file = fs.createWriteStream(path.join(dir, encodeURI(basename)));

  file.on('error', worker.errorAndExit);
  worker.log('Downloading ' + url.href + ' …');

  await new Promise((resolve, reject) => {
    request({
        uri: url.href,
    })
    .pipe(file)
    .on('finish', () => {
        worker.log('The download has finished.');
        resolve();
    })
    .on('error', (error) => {
        reject(error);
    })
  }).catch(worker.errorAndExit);

  workerJob.status = 'success';
  workerJob.fileURI = pathName;
};

// Initialize and start the worker process
worker.initialize(rabbitHost, workerQueue, resultQueue, downloadNewDataFromURL);
