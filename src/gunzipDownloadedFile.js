#!/usr/bin/env node

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');

const logAndExit = (msg) => {
  console.error(msg);
  process.exit();
};

const dir = '../data';

const gunzipDownloadedFile = (dir) => {
  fs.readdir(dir, (err, files) => {
    if (err) return false;

    for (const file of files) {
      let chunks = [];
      let fileBuffer;
      let fileStream = fs.createReadStream(path.join(dir, file));

      fileStream.once('error', (err) => {
        console.error(err);
      });

      fileStream.once('end', () => {
        fileBuffer = Buffer.concat(chunks);

        // TODO ungzip and save as file
        const fileName = file.replace(/.gz$/, '');
        zlib.gunzip(fileBuffer, function (error, result) {
          if (error) throw error;
          fs.writeFileSync(
            path.join(dir, encodeURI(fileName)),
            result.toString()
          );
        });
      });

      fileStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
    }
  });
};

(async function main() {
  const connection = await amqp
    .connect('amqp://localhost', 'heartbeat=60')
    .catch(logAndExit);
  const channel = await connection.createChannel().catch(logAndExit);
  const queue = 'gunzipDownloadedFile_queue';

  channel.assertQueue(queue, {
    durable: true
  });

  channel.consume(
    queue,
    function (msg) {
      msgString = msg.content.toString();
      gunzipDownloadedFile(dir);
      console.log(' [x] Files extracted: %s', msgString);
      if (msgString === 'finished') {
        return;
      }
      channel.sendToQueue(queue, Buffer.from('finished'), {
        persistent: true
      });
      channel.ack(msg);
    },
    {
      noAck: false
    }
  );
})();
