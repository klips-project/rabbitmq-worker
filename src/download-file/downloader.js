import http from 'http';
import https from 'https';
import fs from 'fs';
import logger from './child-logger.js';

/**
 * Downloads a file from the internet to the local filesystem.
 *
 * @param {URL} url The url to download, starting with either 'http' or 'https'
 * @param {String} downloadPath The path on the system to download the file to (must exist)
 * @param {Object} [options={}] HTTP options as describe here https://nodejs.org/api/http.html#httprequestoptions-callback
 *
 * @returns {Promise} A Promise returning the path of the downloaded file on success
 */
const downloadFile = async (url, downloadPath, options = {}) => {

    // choose correct library depending on protocol
    let protocol;
    if (url.protocol === 'http:') {
        protocol = http;
    } else if (url.protocol === 'https:') {
        protocol = https;
    } else {
        throw `Url does not start with 'http' or 'https'`
    }

    return new Promise((resolve, reject) => {
        protocol.get(url.href,
            options,
            response => {
                if (response.statusCode === 200) {
                    logger.debug('URL responds with 200');

                    const fileWriter = fs
                        .createWriteStream(downloadPath)
                        .on('finish', () => {
                            logger.debug('Download finished');
                            resolve(downloadPath);
                        })
                        .on('error', (error) => {
                            logger.error({ error: error }, 'Download failed.')
                            return reject(new Error(error))
                        });
                    response.pipe(fileWriter)
                } else {
                    logger.error({ statusMessage: response.statusMessage, statusCode: response.statusCode }, 'URL returned invalid HTTP code.');
                    return reject(new Error(response.statusMessage))
                }
            })
            .on('error', (error) => {
                logger.error({ error: error }, 'Download failed.')
                return reject(error);
            });
    })
}

export default downloadFile;
