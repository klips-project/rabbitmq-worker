import amqp from 'amqplib';
import { log } from '../workerTemplate.js';
import { randomUUID } from 'crypto';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const rabbitHeartbeat = process.env.RABBITHEARTBEAT || 60;

let channel;

/**
 * Listen for a job message and trigger the different involved workers.
 * The entries in the job array are handled sequential, starting from top. The `type` of
 * a worker configuration is used as the queue name to push the job and its configuration to.
 * In the following example, the first worker will be called by passing a message to the
 * queue named `download`, while the message itself is the original job message extend by
 * a `nextTask` entry which indicates which task shall be handled next.
 * If tasks finish successfully, they usually return values which will then be appended to
 * the specific task configuration via the `outputs` array.
 *
 * @example job message content:
 *
  {
    "job": [
      {
        "id": 123,
        "type": "download-file",
        "inputs": [
          "https://deb.debian.org/debian/dists/bullseye/main/installer-amd64/current/images/cdrom/debian-cd_info.tar.gz",
          "/home/data/"
        ]
      },
      {
        "id": 456,
        "type": "gunzip",
        "inputs": [
          {
            "outputOfId": 123,
            "outputIndex": 0
          }
        ]
      }
    ]
  }
 */
const dispatcher = async () => {
  const connection = await amqp.connect({
    hostname: rabbitHost,
    username: rabbitUser,
    password: rabbitPass,
    heartbeat: rabbitHeartbeat
  });

  channel = await connection.createChannel();

  channel.assertExchange('DeadLetterExchange', 'fanout', {
    durable: true,
    autoDelete: false
  });

  channel.assertQueue('DeadLetterQueue', { durable: true });

  channel.bindQueue('DeadLetterQueue', 'DeadLetterExchange', '');

  channel.assertQueue(workerQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'DeadLetterExchange'
    }
  });
  channel.assertQueue(resultQueue, {
    durable: true
  });

  log(
    `Dispatcher waiting for messages in ` + `${workerQueue} and ${resultQueue}.`
  );

  channel.consume(workerQueue, handleNextTask, {
    noAck: false
  });

  channel.consume(resultQueue, handleResults, {
    noAck: false
  });
};

/**
 * Determine the next task from job list and sends it to worker queue.
 * If there is no task left, finish the execution with success.
 * If an error is detected in a result message, we `nack` the job message which
 * then will be forwarded to the dead letter exchange.
 * @param {Object} msg The message
 */
const handleNextTask = (msg) => {
  let nextTaskEntry;

  try {
    const job = JSON.parse(msg.content.toString());
    const chain = job.job;
    log('Received a job configuration ...');

    if (job.error) {
      throw job.error;
    }

    // validate
    if (!chain || chain.length < 1) {
      throw 'Invalid arguments given' + job;
    }

    // create unique ID if necessary (on first run)
    if (!job.id) {
      job.id = randomUUID();
    }

    // find next task that has not run yet (status is not 'success')
    nextTaskEntry = chain.find(
      (task) => !(task.status && task.status === 'success')
    );

    if (nextTaskEntry) {
      job.nextTask = {
        task: nextTaskEntry,
        idx: chain.findIndex((el) => el.id === nextTaskEntry.id)
      };
      log(`Sending the next task to queue ${nextTaskEntry.type} ...`);
      channel.sendToQueue(
        nextTaskEntry.type,
        Buffer.from(JSON.stringify({ content: job })),
        {
          persistent: true
        }
      );
    } else {
      // overall job success
      job.status = 'success';
      log('Job finished successfully: \n' + JSON.stringify(job, null, 2));
    }
    channel.ack(msg);
  } catch (e) {
    log('Processing failed for task. ' + e);
    // send to dead letter exchange
    channel.nack(msg, false, false);
  }
};

/**
 * Handles the messages from the result queue.
 * Results and status will be appended to the single task that has run,
 * which then is written back to the initial overall job config.
 * @param {Object} msg The message
 */
const handleResults = (msg) => {
  try {
    const job = JSON.parse(msg.content.toString());
    log('Got a new task result...');
    if (
      job &&
      job.nextTask &&
      job.nextTask.task &&
      job.nextTask.task.status === 'success'
    ) {
      // write back outputs to original job config
      job.job[job.nextTask.idx] = job.nextTask.task;
      // remove the succeeded job from the `nextTask` queue
      delete job.nextTask;
    }
    log(`Sending job back to main worker queue ${workerQueue} ...`);
    channel.sendToQueue(workerQueue, Buffer.from(JSON.stringify(job)), {
      persistent: true
    });
    channel.ack(msg);
  } catch (e) {
    log('Processing failed for result. ' + e);
    // send to dead letter exchange
    channel.nack(msg, false, false);
  }
};

// Initialize and start the dispatcher
dispatcher();
