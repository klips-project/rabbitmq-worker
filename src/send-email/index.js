import nodemailer from 'nodemailer';
import { log, initialize } from '../workerTemplate.js';

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const mailHost = process.env.MAILHOST;
const mailPort = process.env.MAILPORT;
const secure = process.env.SECURE === 'true' ? true : false;
const authUser = process.env.AUTHUSER;
const authPass = process.env.AUTHPASS;
const fromSenderName = process.env.FROMSENDERNAME;
const fromSenderEmail = process.env.FROMSENDEREMAIL;

/**
 * Sends an email to an address specified in the job_sender workflow via smtp
 * and uses the server specified in the docker-compose file
 * There you have to enter the access data for a valid account on an existing
 * email server.
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 * @example
 *   {
       "type": "send-email",
       "inputs": [
         "to@recipient.org",
         "subject",
         "content"
       ]
     }
 */
const sendEmail = async (workerJob, inputs) => {
  const recipientEmail = inputs[0];
  const subject = inputs[1] || 'No subject';
  const text = inputs[2] || 'No content';
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: authUser,
      pass: authPass
    }
  });

  transporter.verify(async function (error) {
    if (error) {
      throw error;
    } else {
      await transporter
        .sendMail({
          from: `"${fromSenderName}" <${fromSenderEmail}>`,
          to: recipientEmail,
          subject,
          text
        });
    }
  });

  log(`Sending mail to ${recipientEmail} …`);

  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, sendEmail);
