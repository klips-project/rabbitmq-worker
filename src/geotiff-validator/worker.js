import { GeotiffValidator } from './validator.js';
import logger from './child-logger.js';

/**
 * Creates the callback function that validates a GeoTIFF.
 *
 * @param {Object} config The config object for the GeoTIFF validator
 *
 * @returns {Function} The callback function
 */
const createGeotiffValidationFun = (config) => {

    /**
     * Checks if a GeoTIFF is valid.
     *
     * @param {Object} workerJob The job object
     * @param {Array} inputs The inputs for this process
     */
    return async (workerJob, inputs) => {
        const filePath = inputs[0];
        // handle configuration from job
        let validationSteps;
        if (config) {
            validationSteps = inputs[1] ? Object.keys(inputs[1]) : Object.keys(config);
        }
        let jobConfig = inputs[1] ? inputs[1] : false;
        // overwrite worker configuration
        if (jobConfig) {
            config = { ...config, ...jobConfig };
        }

        logger.debug({jobConfig: config}, 'Starting  ... ')

        const geotiffValidator = new GeotiffValidator(config);
        const validationResults = await geotiffValidator.performValidation(filePath, validationSteps);

        logger.debug({results: validationResults}, 'Validation finished');

        const validationErrors = validationResults.filter(result => {
            return !result.valid;
        })

        if (validationErrors.length === 0) {
            workerJob.status = 'success';
            workerJob.outputs = [filePath];
            logger.debug('GeoTIFF is valid')
        } else {
            let errorMessage = 'GeoTIFF is invalid:';
            validationErrors.forEach(validationError => {
                errorMessage = `${errorMessage}\n${validationError.type}: ${validationError.info}`;
            });
            logger.debug(errorMessage);
            throw errorMessage;
        }
    }
}

export { createGeotiffValidationFun };
