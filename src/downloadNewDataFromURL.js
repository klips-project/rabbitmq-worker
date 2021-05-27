#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const amqp = require('amqplib');

const logAndExit = (msg) => {
  console.error(msg);
  process.exit();
};

const dir = '../data';
const uri =
  'https://opendata.dwd.de/weather/weather_reports/synoptic/germany/geojson/Z__C_EDZW_20210527073600_bda01%2Csynop_bufr_GER_999999_999999__MW_885.geojson.gz';

const downloadNewDataFromURL = (uri) => {
  const url = new URL(uri);
  const basename = path.basename(url.pathname);
  const file = fs.createWriteStream(path.join(dir, encodeURI(basename)));

  const request = https.get(url.href, function (response) {
    response.pipe(file);
  });
};

(async function main() {
  var connection = await amqp
    .connect('amqp://localhost', 'heartbeat=60')
    .catch(logAndExit);
  var channel = await connection.createChannel().catch(logAndExit);
  var queue = 'downloadNewDataFromURL_queue';

  channel.assertQueue(queue, {
    durable: true
  });

  channel.consume(
    queue,
    function (msg) {
      msgString = msg.content.toString();
      downloadNewDataFromURL(uri); // TODO: may be provided as argument by queue
      console.log(' [x] Downloaded new File: %s', msgString);
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
