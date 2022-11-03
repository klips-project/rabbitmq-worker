import { GeotiffValidator } from './validator.js';

/**
 * Creates the callback function that validates a GeoTIFF.
 *
 * @param {Object} config The config object for the GeoTIFF validator
 * @param {Function} validate The ajv validation fucntion
 *
 * @returns {Function} The callback function
 */
const createGeotiffValidationFun = (config, validate) => {

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
        if (!validate(config)) {
            throw "Worker configuration not valid.";
        }

        const geotiffValidator = new GeotiffValidator(config);
        const validationResults = await geotiffValidator.performValidation(filePath, validationSteps);

        const validationErrors = validationResults.filter(result => {
            return !result.valid;
        })

        if (validationErrors.length === 0) {
            workerJob.status = 'success';
            workerJob.outputs = [filePath];
        } else {
            let errorMessage = 'GeoTIFF is invalid:';
            validationErrors.forEach(validationError => {
                errorMessage = `${errorMessage}\n${validationError.type}: ${validationError.info}`;
            });
            throw errorMessage;
        }
    }

}

export { createGeotiffValidationFun };
