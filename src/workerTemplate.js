#!/usr/bin/env node

/*
 * This is a template rabbitmq worker.
 * It connects to the given queue listening for jobs.
 * Jobs will get processed through the given callback function.
 * Results will be reported in the given result queue.
 * See the different workers for implementation examples
 */
const amqp = require('amqplib');
let channel;
let workerId;
let resultsQueue;

/**
 * Reports error and exits
 * @param {String} msg The error message
 */
function errorAndExit(msg) {
  log('Error caught: ' + msg);
  if (channel && msg && msg.content) {
    channel.sendToQueue(resultsQueue, Buffer.from(msg.content.toString()), {
        persistent: true
    });
    channel.nack(msg);
  }
  process.exit();
}

/**
 * Log a message with current timestamp and worker ID
 * @param {String} msg 
 */
function log(msg) {
  console.log(' [*] ' + new Date().toISOString() + ' ID:' + workerId + ': ' + msg);
}

/**
 * Main method used to implement a worker.
 * Calls the given callback when a message is received and report back
 *
 * @param {String} rabbitHost The amqp rabbitmq host, e.g. `amqp://localhost` 
 * @param {String} workerQueue The name of the worker queue to look for jobs
 * @param {String} resultQueue The name of the result queue to report back to
 * @param {Function} callBack The callback function getting called when a job is received
 */
async function initialize(rabbitHost, workerQueue, resultQueue, callBack) {
  const connection = await amqp
    .connect(rabbitHost, 'heartbeat=60')
    .catch(errorAndExit);
  channel = await connection.createChannel().catch(errorAndExit);
  workerId = parseInt(new Date() * Math.random(), 10);
  resultsQueue = resultQueue;

  channel.assertQueue(workerQueue, {
    durable: true
  });

  log(`Worker waiting for messages in ${workerQueue}. To exit press CTRL+C`);
  channel.consume(
    workerQueue,
    async function (msg) {
      try {
        const job = JSON.parse(msg.content.toString());
        log(`Received a message in queue ${workerQueue}: ` +
          JSON.stringify(job.content.nextJob)
        );
        let workerJob = job.content.nextJob.job;

        await callBack(workerJob);

        channel.sendToQueue(
          resultQueue,
          Buffer.from(JSON.stringify(job.content)),
          {
            persistent: true
          }
        );
        channel.ack(msg);
        log('Worker finished');
      } catch (e) {
        errorAndExit(e);
      }
    },
    {
      noAck: false
    }
  );
}

module.exports = {
    log,
    errorAndExit,
    initialize
};
