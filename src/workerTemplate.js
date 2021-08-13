import amqp from 'amqplib';

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
 * @param {String} msg The error message
 */
export function errorAndExit(msg) {
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
export function log(msg) {
  console.log(' [*] ' + new Date().toISOString() + ' ID:' + workerId + ': ' + msg);
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
export async function initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, callBack) {
  const connection = await amqp.connect({
    hostname: rabbitHost,
    username: rabbitUser,
    password: rabbitPass,
    heartbeat: 60
  }).catch(errorAndExit);
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
        errorAndExit(e);
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
 * @param {Object} workerJob The current worker job
 * @returns {Array} inputs The inputs
 */
function getInputs(job, workerJob) {
  const inputs = [];
  if (workerJob.inputs) {
    workerJob.inputs.forEach(el => {
      if (el instanceof Object && el.outputOfId) {
        inputs.push(job.find(proc => proc.id === el.outputOfId).outputs[el.outputIndex]);
      } else {
        inputs.push(el);
      }
    });
  }
  return inputs;
}
