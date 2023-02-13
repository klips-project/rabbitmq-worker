import { GeotiffValidator, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection, validateNoDataValue } from './validator.js';
import gdal from 'gdal-async';

const path = 'src/geotiff-validator/sample_data/sample.tif';

describe('GeotiffValidator', () => {
    it('returns true if GeoTIFF is valid', async () => {
       const config =  {
            extent: {
               allowedExtent: [
                    [
                       1,
                       1
                    ],
                    [
                        89,
                        89
                    ]
                ]
            },
            projection: {
                allowedEPSGCodes: [
                    4326,
                ]
            },
            dataType: {
                allowedDataTypes: [
                    "Byte",
                    "Float32"
                ]
            },
            fileSize: {
                minFileSize: 1000,
                maxFileSize: 10000000
            },
            bands: {
                expectedCount: 4
            },
            noDataValue: {
                expectedValue: 42
            }
        }
        const geotiffValidator = new GeotiffValidator(config);
        const result = await geotiffValidator.performValidation(path, ['extent', 'projection', 'dataType', 'fileSize', 'bands', 'noDataValue'])
        const allStepsAreValid = result.every(stepResult => stepResult.valid)
        expect(allStepsAreValid).toBe(true);
    });
});


describe('validateFilesize', () => {
    it('returns true if size is in valid range', () => {
        const result = validateFilesize(path, 34000, 36000);
        expect(result.valid).toBe(true);
    });
    it('returns false if size is outside valid range', () => {
        const result = validateFilesize(path, 1, 2);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});

describe('validateProjection', () => {
    it('returns true on valid projection', async () => {
        const dataset = await gdal.openAsync(path);
        const result = await validateProjection(dataset, [4326, 3035]);
        expect(result.valid).toBe(true);
    });

    it('returns false on invalid projection', async () => {
        const dataset = await gdal.openAsync(path);
        let result = await validateProjection(dataset, [3857]);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});

describe('validateDataType', () => {
    it('returns true on valid datatype', async () => {
        const dataset = await gdal.openAsync(path);
        const result = await validateDataType(dataset, ['Byte']);
        expect(result.valid).toBe(true);
    });

    it('returns false on invalid datatype', async () => {
        const dataset = await gdal.openAsync(path);
        const result = await validateDataType(dataset, ['Float32']);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});

describe('validateBands', () => {
    it('returns true on valid band count', async () => {
        const dataset = await gdal.openAsync(path);
        const result = await validateBands(dataset, 4);
        expect(result.valid).toBe(true);
    });

    it('returns false on invalid band count', async () => {
        const dataset = await gdal.openAsync(path);
        const result = await validateBands(dataset, 1);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});

describe('validate Extent', () => {
    it('returns true on valid extent', async () => {
        const dataset = await gdal.openAsync(path);
        const validExtent = [1, 1, 89, 89];
        const result = await validateExtent(dataset, validExtent);
        expect(result.valid).toBe(true);
    });

    it('returns false on invalid extent', async () => {
        const dataset = await gdal.openAsync(path);
        const invalidExtent = [2.2, 39.1, 3.5, 39.9];
        const result = await validateExtent(dataset, invalidExtent);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});

describe('validate NoDataValue', () => {
    it('returns true on valid noDataValue', async () => {
        const dataset = await gdal.openAsync(path);
        const validNoDataValue = 42;
        const result = await validateNoDataValue(dataset, validNoDataValue);
        console.log(result);
        expect(result.valid).toBe(true);
    });

    it('returns false on invalid noDataValue', async () => {
        const dataset = await gdal.openAsync(path);
        const invalidNoDataValue = 123;
        const result = await validateNoDataValue(dataset, invalidNoDataValue);
        expect(result.valid).toBe(false);
        expect(result.info).toBeDefined();
    });
});
