import { sampleConfig } from './sharedConfig.js';
import { createGeotiffValidationFun } from './worker.js';

describe('createGeotiffValidationFun', () => {

    it('provides correct outputs', async () => {
        const validateGeoTiff = createGeotiffValidationFun(sampleConfig);

        const job = {};
        const path = 'src/geotiff-validator/sample_data/sample.tif';
        await validateGeoTiff(job, [path]);
        expect(job.outputs).toBeDefined();
        expect(job.outputs.length).toBe(1);
    });
});
