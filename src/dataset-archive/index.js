import { initialize } from '../workerTemplate.js';
import logger from './child-logger.js';
import path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
import { getClient } from './get-client.js';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;
const iorUser = process.env.IORUSER;
const iorPass = process.env.IORPASS;
const iorPath = process.env.IORPATH;

const archiveWorker = async (workerJob, inputs) => {
    const inputPath = inputs[0];
    const finalDatadir = inputs[1];
    const dirToArchive = `${finalDatadir}archive`;
    const inputFilename = path.basename(inputPath);
    // get region and timestamp from input (example format: langenfeld_20230629T0500Z.tif)
    const regex = /^([^_]+)_(\d{8}T\d{4}Z)/;
    const matches = inputFilename.match(regex);
    const region = matches[1];
    // timestamp in filename is in UTC time, round to last hour
    const datasetTimestamp = dayjs.utc(matches[2], 'YYYYMMDDTHHmmZ').startOf('hour');
    if (!datasetTimestamp.isValid()) {
        // timestamp of dataset not valid
        logger.error('Could not parse dataset timestamp.');
        throw 'Could not parse dataset timestamp.';
    }
    // get timestamp for current hour
    const currentTimestamp = dayjs.utc().startOf('hour');
    const fileToArchive = `${region}_${datasetTimestamp.format('YYYYMMDDTHHmm')}Z.tif`;

    /**
 * Executes a shell command and return it as a Promise.
 * Kudos to https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 *
 * @param cmd {String} The command to execute
 * @return {Promise<String>} A Promise returning the console output
 */
    const execShellCommand = (cmd) => {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    logger.warn(error);
                    reject(error);
                }
                resolve(stdout ? stdout : stderr);
            });
        });
    };

    const copyToArchiveDir = async () => {
        // check if incomimg dataset timestamp === current timestamp and create file name to archive
        if (datasetTimestamp.isSame(currentTimestamp)) {
            // ensures that the archive folder exists
            fs.access(dirToArchive, (err) => {
                err ? fs.mkdir(dirToArchive) : logger.info('Archive Folder does already exists');
            })

            await fs.copyFile(
                `${finalDatadir}/${region}/${region}_temperature/${fileToArchive}`,
                `${dirToArchive}/${fileToArchive}`,
                (err) => {
                    err ? logger.warn(`${fileToArchive} could not be copied because of the following error: ${err}`)
                        : logger.info(`${fileToArchive} is successfully copied`)
                }
            );
        }
    };

    const copyToArchive = async () => {
        // check if incomimg dataset timestamp === current timestamp and create file name to archive
        if (datasetTimestamp.isSame(currentTimestamp)) {
            const filePath = `${finalDatadir}/${region}/${region}_temperature/${fileToArchive}`

            const curlCmd = `curl --user ${iorUser}:${iorPass} -s -S -X POST -H "Content-type: application/zip" -d @${filePath} ${iorPath}?file_name=${fileToArchive}`;
            try {
                await execShellCommand(curlCmd);
                logger.info("Successfuly excuted cURL command.");
            }
            catch {
                logger.debug("Could not execute cURL command.");
            }
        } else {
            logger.info(`${datasetTimestamp} did not match the currentTimestamp: ${currentTimestamp}`)
        }
    };
    // clean up files that are older than 49 hours
    const datatype = [
        {
            name: '_temperature',
            timecol: 'time',
            directoryPath: `${finalDatadir}/${region}/${region}_temperature/`
        },
        {
            name: '_reclassified',
            timecol: 'time',
            directoryPath: `${finalDatadir}/${region}/${region}_reclassified/`
        },
        {
            name: '_contourlines',
            timecol: 'timestamp'
        }
    ]

    const cleanUpFiles = async (directoryPath) => {
        logger.info('File cleanup started');
        // 1. get all timestamps in directory
        const files = fs.readdirSync(directoryPath, (err) => {
            if (err) logger.warn(err)
        });
        const timestamps = files.map((element) => dayjs.utc(element.match(regex)[2], 'YYYYMMDDTHHmmZ').startOf('hour'));
        // 2. get timestamps that are older than 49 hours
        const timestampsToDelete = timestamps.filter(timestamp => timestamp < currentTimestamp.subtract(49, 'hours'));
        // 3. create list of files to delete

        const fileNamesToDelete = [];
        for (const timestamp of timestampsToDelete) {
            const fileToDelete = files.filter(file => file.includes(timestamp.format('YYYYMMDDTHH')));
            if (fileToDelete) {
                fileNamesToDelete.push(fileToDelete);
            } else {
                continue
            }
        }

        const filesToDelete = fileNamesToDelete.map((fileName) => `${directoryPath}${fileName}`);

        for (const file of filesToDelete) {

            await fs.unlink(file, (err => {
                err ? logger.error(err) : logger.info('Deleted file:', file)
            }));
        }
    };

    // Clean up databse tables
    const cleanUpDb = async (datatype) => {
        logger.info('Database cleanup started');
        const timestamp = currentTimestamp.subtract(49, 'hours').format('YYYY-MM-DD HH:mm:ss');

        let client;
        try {
            // connect to database
            client = await getClient();
            // delete rows older than 49 hours
            const cleanUpQuery = `DELETE FROM ${region}${datatype.name} WHERE ${datatype.timecol} < '${timestamp}';`;
            await client.query(cleanUpQuery);
            logger.info(`Cleaned up table.`);
        } catch (e) {
            logger.error('SQL execution aborted:' + e);
        } finally {
            if (client) {
                await client.end();
            }
        }
    }

    try {
        copyToArchiveDir();
        copyToArchive();
        for (const type of datatype) {
            if (type.directoryPath) {
                await cleanUpFiles(type.directoryPath);
            }
            await cleanUpDb(type);
        }
    } catch (error) {
        logger.error(`Could not copy dataset with timestamp: ${datasetTimestamp}.`);
    }

    workerJob.status = 'success';

    logger.info(`Archiving finished.`);
};

(async () => {
    try {
        // Initialize and start the worker process
        await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, archiveWorker);
    } catch (error) {
        logger.error({ error: error }, `Problem when initializing`);
    }
})();
export default archiveWorker;
