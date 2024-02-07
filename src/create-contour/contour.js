import { exec } from 'child_process';
import fs from 'fs';

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

// todo fix naming for the comments

/**
 * Reclassify a GeoTIFF according to custom levels.
 *
 * Relies on GRASS
 *
 * @param {String} inputPath The path of the GeoTIFF to convert
 * @param {String} fileName The path where the created COG shall be stored
 * @param {String} fileName The levels according to which the GeoTIFF shall be reclassified
 *
 * @returns {Promise<String>} A Promise that resolves to the console output of the underlying GDAL process
 *
 * @throws If provided paths are invalid or conversion fails, an error is thrown
 */
const createContourLines = async (inputPath, fileName, interval) => {
    // valdate inputPath
    if (! await fs.existsSync(inputPath)) {
        throw `Input file does not exist: ${inputPath}/`;
    }

    // build command for sub-process
    //   -q: prevent non-error output
    const contourCmd = `gdal_contour -b 2 -a TEMP -i ${interval} -f "GeoJSON" /${inputPath}/${fileName} /tmp/output.geojson`;

    return await execShellCommand(contourCmd);
}

export default createContourLines;
