import amqp from 'amqplib';
import { randomUUID } from 'crypto';
import logger from './child-logger.js';

/**
 * Dispatcher that handles communication between all workers via RabbitMQ.
 *
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
export class Dispatcher {
  /**
   * Create a dispatcher instance.
   *
   * @param {String} workerQueue The name of the worker queue
   * @param {String} resultQueue The name of the result queue
   * @param {Object} rabbitConf 'amqplib connection object (see https://amqp-node.github.io/amqplib/channel_api.html#connect)
   */
  constructor(workerQueue, resultQueue, rabbitConf) {
    this.rabbitConf = rabbitConf;
    this.workerQueue = workerQueue;
    this.resultQueue = resultQueue;

    this.connection = undefined;
    this.channel = undefined;
  }

  /**
   * Init the dispatching process.
   */
  async init() {
    this.connection = await amqp.connect(this.rabbitConf);

    this.channel = await this.connection.createChannel();

    this.channel.assertExchange('DeadLetterExchange', 'fanout', {
      durable: true,
      autoDelete: false
    });

    this.channel.assertQueue('DeadLetterQueue', { durable: true });

    this.channel.bindQueue('DeadLetterQueue', 'DeadLetterExchange', '');

    this.channel.assertQueue(this.workerQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'DeadLetterExchange'
      }
    });
    this.channel.assertQueue(this.resultQueue, {
      durable: true
    });

    logger.debug(
      `Waiting for messages in ${this.workerQueue} and ${this.resultQueue}.`
    );

    this.channel.consume(this.workerQueue, this.createHandleNextTaskFun(), {
      noAck: false
    });

    this.channel.consume(this.resultQueue, this.createHandleResultFun(), {
      noAck: false
    });
  }

  /**
   * Creates a function that is executed when next task is available.
   *
   * Function needs to be created in this way to ensure it has access
   * to the channel within its scope.
   *
   * @returns {Function} The function
   */
  createHandleNextTaskFun() {

    /**
     * Determine the next task from job list and sends it to worker queue.
     * If there is no task left, finish the execution with success.
     * If an error is detected in a result message, we `nack` the job message which
     * then will be forwarded to the dead letter exchange.
     *
     * @param {Object} msg The message
     */
    return async (msg) => {
      let nextTaskEntry;

      try {
        const job = JSON.parse(msg.content.toString());
        const chain = job.job;
        logger.debug({ job: job }, 'Received job configuration ...');

        if (job.error) {
          throw job.error;
        }

        // validate
        if (!chain || chain.length < 1) {
          const errorMessage = 'Invalid argument given';
          logger.error({ job: job },errorMessage)
          throw errorMessage + job;
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
          logger.debug(`Sending the next task to queue ${nextTaskEntry.type} ...`);
          this.channel.sendToQueue(
            nextTaskEntry.type,
            Buffer.from(JSON.stringify({ content: job })),
            {
              persistent: true
            }
          );
        } else {
          // overall job success
          job.status = 'success';
          const isRollBackJob = job?.job?.[0].type === 'rollback-handler';

          if (isRollBackJob) {
            logger.warn({ job_id: job.id, job: job, isRollBackJob: isRollBackJob }, 'Rollback job finished successfully');
          } else {
            logger.info({ job_id: job.id, job: job }, 'Job finished successfully');
          }
        }

        this.channel.ack(msg);
      } catch (taskError) {
        logger.error({ error: taskError }, 'Processing failed');
        // send to dead letter exchange
        this.channel.nack(msg, false, false);
      }
    };
  }

  /**
   * Creates a function that is executed when result is ready.
   *
   * Function needs to be created in this way to ensure it has access
   * to the channel within its scope.
   *
   * @returns {Function} The function
   */
  createHandleResultFun() {

    /**
     * Handles the messages from the result queue.
     * Results and status will be appended to the single task that has run,
     * which then is written back to the initial overall job config.
     *
     * @param {Object} msg The message
     */
    return async (msg) => {
      try {
        const job = JSON.parse(msg.content.toString());
        logger.debug('Got a new task result...');
        if (job?.nextTask?.task?.status === 'success') {
          // write back outputs to original job config
          job.job[job.nextTask.idx] = job.nextTask.task;
          // remove the succeeded job from the `nextTask` queue
          delete job.nextTask;
        }
        logger.debug(`Sending job back to main worker queue ${this.workerQueue} ...`);
        this.channel.sendToQueue(this.workerQueue, Buffer.from(JSON.stringify(job)), {
          persistent: true
        });
        this.channel.ack(msg);
      } catch (taskError) {
        logger.error({ error: taskError }, 'Handling result failed');
        // send to dead letter exchange
        this.channel.nack(msg, false, false);
      }
    }
  }
}
