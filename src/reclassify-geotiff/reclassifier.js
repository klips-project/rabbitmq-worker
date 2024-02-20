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
 * @param {String} inputPath The path of the GeoTIFF to converted
 * @param {String} inputFile The filename of the GeoTIFF to converted
 * @param {String} outputPath The path where the created COG shall be stored
 * @param {String} levels The levels according to which the GeoTIFF shall be reclassified. 
 * Levels are an array including the boundaries for the classes example: [0, 13, 21, 26, 31, 40, 53] defines classes from <=0, 0-13,[...],<53
 *
 * @returns {Promise<String>} A Promise that resolves to the console output of the underlying GDAL process
 *
 * @throws If provided paths are invalid or conversion fails, an error is thrown
 */
const reclassifyGeoTiff = async (inputPath, outputPath, tmpOutputPath, levels) => {
    
    // valdate inputPath
    if (! await fs.existsSync(inputPath)) {
        throw `Input file does not exist: ${inputPath}`;
    }

    const cmdInput = [];
    levels.forEach((element, index, array) => {
        if (index > 0) {
            const lower = array[index - 1];
            const upper = element;
            cmdInput.push(`logical_and(A>${lower},A<=${upper})*${index+1}`);
        } else {
            return '';
        }
    });

    const lastLevel = levels[levels.length - 1];

    // validate outputPath
    const outputDir = path.dirname(outputPath);
    if (! await fs.existsSync(outputDir)) {
        throw `Output directory does not exist: ${outputDir}`;
    }

    // build command for sub-process
    //   -q: prevent non-error output
    const reclassifyCmd = `gdal_calc.py -A ${inputPath} --calc="(A<=${levels[0]})*1 + ${cmdInput.join(' + ')} + (A>${lastLevel})*${levels.length + 1}" --outfile ${tmpOutputPath} |
    gdal_translate ${tmpOutputPath} ${outputPath} -q -of COG -co COMPRESS="DEFLATE"`;

    return await execShellCommand(reclassifyCmd);
}

export default reclassifyGeoTiff;

