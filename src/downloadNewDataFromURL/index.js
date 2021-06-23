#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const amqp = require('amqplib');
const { worker } = require('cluster');

const dir = '/home/data';

const downloadNewDataFromURL = (uri) => {
  const url = new URL(uri);
  const basename = path.basename(url.pathname);
  const file = fs.createWriteStream(path.join(dir, encodeURI(basename)));

  console.log('Downloading ' + url.href + ' …');

  const request = https.get(url.href, function (response) {
    response.pipe(file);
  });

  return path.join(dir, encodeURI(basename));
};

const logAndExit = (msg) => {
  console.error(msg);
  process.exit();
};

(async function main() {
  const connection = await amqp
    .connect('amqp://rabbitmq', 'heartbeat=60')
    .catch(logAndExit);
  const channel = await connection.createChannel().catch(logAndExit);
  const downloadQueue = 'download';
  const resultQueue = 'results';

  channel.assertQueue(downloadQueue, {
    durable: true
  });

  console.log(
    ' [*] Downloader waiting for messages in %s. To exit press CTRL+C',
    downloadQueue
  );
  channel.consume(
    downloadQueue,
    function (msg) {
      try {
        const job = JSON.parse(msg.content.toString());
        console.log(
          ' [x] Downloader received a message in download queue: %s',
          JSON.stringify(job.content.nextJob)
        );
        const workerJob = job.content.nextJob.job;
        const uri = workerJob.datasetURI;

        const pathName = downloadNewDataFromURL(uri);

        workerJob.status = 'success';
        workerJob.fileURI = pathName;

        channel.sendToQueue(
          resultQueue,
          Buffer.from(JSON.stringify(job.content)),
          {
            persistent: true
          }
        );
        channel.ack(msg);
      } catch (e) {
        console.error('catched: ', e);
        channel.sendToQueue(resultQueue, Buffer.from(msg.content.toString()), {
          persistent: true
        });
        channel.nack(msg);
      }
    },
    {
      noAck: false
    }
  );
})();
