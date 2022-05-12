import amqp from 'amqplib';
import { randomUUID } from 'crypto';

/*
 * This is a template RabbitMQ worker.
 * It connects to the given queue listening for jobs.
 * Jobs will get processed through the given callback function.
 * Results will be reported in the given result queue.
 * See the different workers for implementation examples
 */
let channel;
let workerId;
let globalResultQueue;

/**
 * Main method used to implement a worker.
 * Calls the given callback when a message is received and report back
 *
 * @param {String} rabbitHost The AMQP RabbitMQ host, e.g. `localhost`
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
  const connection = await amqp.connect({
    hostname: rabbitHost,
    username: rabbitUser,
    password: rabbitPass,
    heartbeat: 60
  });
  channel = await connection.createChannel();
  workerId = randomUUID();
  globalResultQueue = resultQueue;

  channel.assertQueue(workerQueue, {
    durable: true
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
        const workerJob = job.content.nextTask.task;
        await callBack(workerJob, getInputs(job.content.job, workerJob));

        channel.sendToQueue(
          resultQueue,
          Buffer.from(JSON.stringify(job.content)),
          {
            persistent: true
          }
        );
        log('Worker finished');
      } catch (e) {
        reportError(e, msg);
      }
      channel.ack(msg);
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

/**
 * Reports error to the results queue
 * @param {String} error The error message
 * @param {String} message The optional RabbitMQ Message
 */
 export function reportError(error, message) {
  console.log('Error caught: ', error);

  if (channel && message && message.content) {
    const job = JSON.parse(message.content.toString());
    job.content.error = error.toString();
    channel.sendToQueue(globalResultQueue, Buffer.from(JSON.stringify(job.content)), {
      persistent: true
    });
  } else {
    throw 'Could not report error to results queue, missing message or channel';
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
