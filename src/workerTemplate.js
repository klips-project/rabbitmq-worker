import amqp from 'amqplib';
import { randomUUID } from 'crypto';

/*
 * This is a template rabbitmq worker.
 * It connects to the given queue listening for jobs.
 * Jobs will get processed through the given callback function.
 * Results will be reported in the given result queue.
 * See the different workers for implementation examples
 */
let channel;
let workerId;
let resultsQueue;

/**
 * Reports error and exits
 * @param {String} msg The RabbitMQ Message
 * @param {String} e The error message
 */
export function errorAndExit(e, msg, chnl) {
  console.log('==== ERROR AND EXIT =====');
  console.log('e (Error): ');
  console.log(e);
  console.log('msg (RMQ): ');
  console.log(msg);

  if (!channel) {
    channel = chnl;
  }

  if (channel && msg) {
    console.log('im channel & msg IF geladnet');
    console.log(channel);
    if (msg.content) {
      channel.sendToQueue(resultsQueue, Buffer.from(msg.content.toString()), {
        persistent: true
      });
    }
    channel.nack(msg, false, false);
  }
}

/**
 * Log a message with current timestamp and worker ID
 * @param {String} msg
 */
export function log(msg) {
  if (!workerId) {
    workerId = randomUUID();
  }
  console.log(
    ' [*] ' + new Date().toISOString() + ' ID:' + workerId + ': ' + msg
  );
}

/**
 * Main method used to implement a worker.
 * Calls the given callback when a message is received and report back
 *
 * @param {String} rabbitHost The amqp rabbitmq host, e.g. `localhost`
 * @param {String} rabbitUser The username
 * @param {String} rabbitPass The password
 * @param {String} workerQueue The name of the worker queue to look for jobs
 * @param {String} resultQueue The name of the result queue to report back to
 * @param {Function} callBack The callback function getting called when a job is received
 */
export async function initialize(
  rabbitHost,
  rabbitUser,
  rabbitPass,
  workerQueue,
  resultQueue,
  callBack
) {
  const connection = await amqp
    .connect({
      hostname: rabbitHost,
      username: rabbitUser,
      password: rabbitPass,
      heartbeat: 60
    })
    .catch(errorAndExit);
  channel = await connection.createChannel().catch(errorAndExit);
  workerId = randomUUID();
  resultsQueue = resultQueue;

  channel.assertQueue(workerQueue, {
    durable: true
    // arguments: {
    //   'x-dead-letter-exchange': 'DeadLetterExchange'
    // }
  });

  log(`Worker waiting for messages in ${workerQueue}.`);
  channel.consume(
    workerQueue,
    async function (msg) {
      try {
        const job = JSON.parse(msg.content.toString());
        log(
          `Received a message in queue ${workerQueue}: ` +
            JSON.stringify(job.content.nextTask)
        );
        let workerJob = job.content.nextTask.task;
        await callBack(workerJob, getInputs(job.content.job, workerJob));

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
        errorAndExit(e, msg);
      }
    },
    {
      noAck: false
    }
  );
}

/**
 * Returns the inputs array, modified to contain outputs of other processes
 *   if specified like shown in the `README.md`
 * @param {Object} job The main job
 * @param {Object} task The current task
 * @returns {Array} inputs The inputs
 */
function getInputs(job, task) {
  const inputs = [];
  if (task.inputs) {
    task.inputs.forEach((el) => {
      if (el instanceof Object && el.outputOfId) {
        inputs.push(
          job.find((proc) => proc.id === el.outputOfId).outputs[el.outputIndex]
        );
      } else {
        inputs.push(el);
      }
    });
  }
  return inputs;
}
