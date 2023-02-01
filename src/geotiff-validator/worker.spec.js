process.env.RABBITHOST = '46.4.8.29';
import { createGeotiffValidationFun } from './worker.js';
import download from '../download-file/index';
import path from 'path';

test('test if createGeotiffValidationFun can be loaded', () => {
    expect(createGeotiffValidationFun).toBeDefined();
});

test('test if geotiff validation function can be called', async () => {
    const config = {
        "extent": {
            "allowedExtent": [
                [
                    2,
                    39
                ],
                [
                    4,
                    41
                ]
            ]
        },
        "projection": {
            "allowedEPSGCodes": [
                4326,
            ]
        },
        "dataType": {
            "allowedDataTypes": [
                "Byte"
            ]
        },
        "fileSize": {
            "minFileSize": 1000,
            "maxFileSize": 10000000
        }
    };

    const validateGeoTiff = createGeotiffValidationFun(config);

    let job = {};
    const downloadPath = path.join('/tmp', 'sample.tif');
    await download(job, [
        'https://raw.githubusercontent.com/klips-project/rabbitmq-worker/main/src/geotiff-validator/sample_data/sample.tif',
        downloadPath
    ]);
    job = {};
    await validateGeoTiff(job, [downloadPath]);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
});
