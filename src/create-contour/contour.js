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

/**
 * Reclassify a GeoTIFF according to custom levels.
 *
 * Relies on GRASS
 *
 * @param {String} inputPath The path of the GeoTIFF to convert
 * @param {String} datasetTimestamp The timestamp of the GeoTIFF
 * @param {String} interval Elevation interval between contours
 *
 * @returns {Promise<String>} A Promise that resolves to the console output of the underlying GDAL process
 *
 * @throws If provided paths are invalid or conversion fails, an error is thrown
 */
const createContourLines = async (inputPath, datasetTimestamp, interval) => {
    // valdate inputPath
    if (! await fs.existsSync(inputPath)) {
        throw `Input file does not exist: ${inputPath}/`;
    }

    // build command for sub-process
    const contourCmd = `gdal_contour -b 2 -a TEMP -i ${interval} -f "GeoJSON" ${inputPath} /opt/cog/output${datasetTimestamp}.geojson`;

    return await execShellCommand(contourCmd);
}

export default createContourLines;
