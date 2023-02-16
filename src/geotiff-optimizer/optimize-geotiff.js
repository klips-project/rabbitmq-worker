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
 * Optimize a GeoTIFF for the cloud by converting it to a COG.
 *
 * Also computes raster overviews.
 * Relies on GDAL >= 3.4
 *
 * @param {String} inputPath The path of the GeoTIFF to convert
 * @param {String} outputPath The path where the created COG shall be stored
 * @param {String} [compression=DEFLATE] The compression to use. For possible options see:
 *                                       https://gdal.org/drivers/raster/cog.html#creation-options
 *
 * @returns {Promise<String>} A Promise that resolves to the console output of the underlying GDAL process
 *
 * @throws If provided paths are invalid or conversion fails, an error is thrown
 */
const optimizeGeoTiff = async (inputPath, outputPath, compression = "DEFLATE") => {
    // valdate inputPath
    if (! await fs.existsSync(inputPath)){
        throw `Input file does not exist: ${inputPath}`;
    }

    // validate outputPath
    const outputDir = path.dirname(outputPath);
    if (! await fs.existsSync(outputDir)){
        throw `Output directory does not exist: ${outputDir}`;
    }

    // build command for sub-process
    //   -q: prevent non-error output
    const makeCogCmd = `gdal_translate ${inputPath} ${outputPath} -q -of COG -co COMPRESS=${compression}`;

    return await execShellCommand(makeCogCmd);
}

export default optimizeGeoTiff;
