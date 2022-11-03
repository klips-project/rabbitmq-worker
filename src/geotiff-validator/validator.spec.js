import { GeotiffValidator, validateFilesize, validateBands, validateDataType, validateExtent, validateProjection } from './validator.js';

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
