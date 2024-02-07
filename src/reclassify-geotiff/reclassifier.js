import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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
                console.warn(error);
                reject(error);
            }
            resolve(stdout ? stdout : stderr);
        });
    });
}

/**
 * Reclassify a GeoTIFF according to custom levels.
 *
 * Relies on GRASS
 *
 * @param {String} inputPath The path of the GeoTIFF to convert
 * @param {String} outputPath The path where the created COG shall be stored
 * @param {String} outputPath The levels according to which the GeoTIFF shall be reclassified
 *
 * @returns {Promise<String>} A Promise that resolves to the console output of the underlying GDAL process
 *
 * @throws If provided paths are invalid or conversion fails, an error is thrown
 */
const optimizeGeoTiff = async (inputPath, outputPath, levels) => {
    // valdate inputPath
    if (! await fs.existsSync(inputPath)) {
        throw `Input file does not exist: ${inputPath}`;
    }

    // validate outputPath
    const outputDir = path.dirname(outputPath);
    if (! await fs.existsSync(outputDir)) {
        throw `Output directory does not exist: ${outputDir}`;
    }

    // build command for sub-process
    //   -q: prevent non-error output
    const reclassifyCmd = `gdal_calc -A dresden_20240209T0400Z.tif --calc="(A<=0)*1 + logical_and(A>0,A<=13)*2 + logical_and(A>13,A<=21)*3 + logical_and(A>21,A<=26)*4 + logical_and(A>26,A<=31)*5 + logical_and(A>31,A<=40)*6 + logical_and(A>40,A<=53)*7 + (A>53)*8" --outfile test.tif`;

    return await execShellCommand(reclassifyCmd);
}

export default optimizeGeoTiff;

