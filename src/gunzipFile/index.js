#!/usr/bin/env node

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');

const logAndExit = (msg) => {
  console.error(msg);
  process.exit();
};

const gunzipDownloadedFile = (file) => {
  let chunks = [];
  let fileBuffer;
  let fileStream = fs.createReadStream(file);
  let fileName = file.replace(/.gz$/, '');

  fileStream.once('error', (err) => {
    console.error(err);
  });

  fileStream.once('end', () => {
    fileBuffer = Buffer.concat(chunks);

    zlib.gunzip(fileBuffer, function (error, result) {
      if (error) throw error;
      fs.writeFileSync(encodeURI(fileName), result.toString());
    });
  });

  fileStream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  return encodeURI(fileName);
};

(async function main() {
  const connection = await amqp
    .connect('amqp://rabbitmq', 'heartbeat=60')
    .catch(logAndExit);
  const channel = await connection.createChannel().catch(logAndExit);
  const extractQueue = 'extract';
  const resultQueue = 'results';

  channel.assertQueue(extractQueue, {
    durable: true
  });

  console.log(
    ' [*] Unzip waiting for messages in %s. To exit press CTRL+C',
    extractQueue
  );
  channel.consume(
    extractQueue,
    function (msg) {
      try {
        const job = JSON.parse(msg.content.toString());
        console.log(
          ' [x] Unzipper received a message in unzip queue: %s',
          JSON.stringify(job.content.nextJob)
        );
        const workerJob = job.content.nextJob.job;

        const file = job.content.job[0].fileURI;

        const fileName = gunzipDownloadedFile(file);

        workerJob.status = 'success';
        workerJob.extractedFile = fileName;

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
