process.env.RABBITHOST = '46.4.8.29';
import { createGeotiffValidationFun } from './worker.js';
import download from '../download-file/index';

test('test if createGeotiffValidationFun can be loaded', () => {
    expect(createGeotiffValidationFun).toBeDefined();
});

test('test if geotiff validation function can be called', async () => {
    const config = {
        "extent": {
            "allowedExtent": [
                [
                    5.85,
                    47.27
                ],
                [
                    15.02,
                    55.07
                ]
            ]
        },
        "projection": {
            "allowedEPSGCodes": [
                3857,
                4326,
                3035
            ]
        },
        "dataType": {
            "allowedDataTypes": [
                "Byte",
                "Int16",
                "Float32",
                "Float64"
            ]
        },
        "fileSize": {
            "minFileSize": 1000,
            "maxFileSize": 10000000
        }
    };

    const validateGeoTiff = createGeotiffValidationFun(config);

    let job = {};
    await download(job, [
        'https://raw.githubusercontent.com/klips-project/klips-sdi/main/mocked-webspace/sample_germany_small.tif',
        'test'
    ]);
    job = {};
    await validateGeoTiff(job, ['test']);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
});
