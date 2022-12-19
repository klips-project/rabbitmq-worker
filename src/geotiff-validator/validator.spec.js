import { GeotiffValidator, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection } from './validator.js';
import gdal from 'gdal-async';

test('Check if GeotiffValidator is defined', () => {
    expect(GeotiffValidator).toBeDefined();
});

test('Check if validateFilesize is defined', () => {
    expect(validateFilesize).toBeDefined();
});

test('Check if validateBands is defined', () => {
    expect(validateBands).toBeDefined();
});

test('Check if validateDataType is defined', () => {
    expect(validateDataType).toBeDefined();
});

test('Check if validateExtent is defined', () => {
    expect(validateExtent).toBeDefined();
});

test('Check if validateProjection is defined', () => {
    expect(validateProjection).toBeDefined();
});

const path = 'src/geotiff-validator/sample_data/sample.tif';

test('file size validation', () => {
    let result = validateFilesize(path, 33000, 34000);
    expect(result.valid).toBe(true);

    result = validateFilesize(path, 1, 2);
    expect(result.valid).toBe(false);
})

test('data type validation', async () => {
    const dataset = await gdal.openAsync(path);
    let result = await validateDataType(dataset, ['Byte']);
    expect(result.valid).toBe(true);

    result = await validateDataType(dataset, ['Float32']);
    expect(result.valid).toBe(false);
});
