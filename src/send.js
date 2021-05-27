#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    // clean directory
    // var queue = 'cleanTargetDirectory_queue';
    // var msg = 'cleanTargetDirectory';

    // download file
    // var queue = 'downloadNewDataFromURL_queue';
    // var msg = 'downloadNewDataFromURL';

    // gunzip file
    // var queue = 'gunzipDownloadedFile_queue';
    // var msg = 'gunzipDownloadedFile';

    channel.assertQueue(queue, {
      durable: true
    });

    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(' [x] Sent %s', msg);
  });

  setTimeout(function () {
    connection.close();
    process.exit(0);
  }, 500);
});
