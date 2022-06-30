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
// the tag of the consumer to the queue
let consumerTag;
// needed to ensure reconnection only happens once
let reconnectionInProgress = false;
let rabbitConnectionEstablished = false;

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
 * @param {Function} areDependenciesAvailable Function to check if depencies of a worker are available
 * @param {Number} [intervalSeconds=10] How often, in seconds, the dependencies of the worker should be checked
 */
export async function initialize(
  rabbitHost,
  rabbitUser,
  rabbitPass,
  workerQueue,
  resultQueue,
  callBack,
  areDependenciesAvailable,
  intervalSeconds
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
  await connectToQueue(
    workerQueue,
    resultQueue,
    callBack)

  await controlRabbitConnection(workerQueue,
    resultQueue,
    callBack,
    areDependenciesAvailable);

  let intervalMilliSeconds;
  if (intervalSeconds) {
    intervalMilliSeconds = intervalSeconds * 1000;
  } else {
    const defaultintervalSeconds = 10;
    intervalMilliSeconds = defaultintervalSeconds * 1000;
  }

  setInterval(async () => {
    await controlRabbitConnection(workerQueue,
      resultQueue,
      callBack,
      areDependenciesAvailable)
  },
    intervalMilliSeconds)
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
 * Initialize the connection to the queue.
 *
 * @param {String} workerQueue The name of the worker queue to look for jobs
 * @param {String} resultQueue The name of the result queue to report back to
 * @param {Function} callBack The callback function getting called when a job is received
 */
async function connectToQueue(
  workerQueue,
  resultQueue,
  callBack) {

  const consumeInfo = await channel.consume(
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

        // TODO: check if this is the right approach
        if (workerJob.missingDependencies) {
          console.log('Depencies of Worker are missing. Job will be requeued');
          channel.nack(msg);
          return;
        }
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
  // unique tag of the consumer, needed for stopping it
  consumerTag = consumeInfo.consumerTag;
  rabbitConnectionEstablished = true;
}
/**
 * Check if worker should still be connected to RabbitMQ.
 *
 * @param {String} workerQueue The name of the worker queue to look for jobs
 * @param {String} resultQueue The name of the result queue to report back to
 * @param {Function} callBack The callback function getting called when a job is received
 * @param {Function} areDependenciesAvailable Function to check if depencies of a worker are available
 */
async function controlRabbitConnection(workerQueue,
  resultQueue,
  callBack,
  areDependenciesAvailable) {

  // TODO: there might be a more elegant way

  let dependenciesAvailable;
  // check if a function is provided
  if (areDependenciesAvailable){
    dependenciesAvailable = await areDependenciesAvailable();
  } else {
    dependenciesAvailable = true;
  }
  if (dependenciesAvailable) {
    console.log("All dependencies are available");
    if (!rabbitConnectionEstablished) {
      if (reconnectionInProgress) {
        console.log('Reconnection to RabbitMQ already in progress');
      } else {
        reconnectionInProgress = true;
        console.log("... Reconnecting to RabbitMQ");
        await connectToQueue(workerQueue,
          resultQueue,
          callBack
        )
        reconnectionInProgress = false;
        console.log('Reestablished rabbit connection');
      }
    }
  } else {
    console.log('ERROR: Dependencies are not available');
    if (rabbitConnectionEstablished) {
      console.log('Deactivated Rabbit connection');
      rabbitConnectionEstablished = false;
      await channel.cancel(consumerTag);
    } else {
      console.log('Rabbit connection is already deactivated');
    }
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
