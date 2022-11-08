import optimizeGeoTiff from './optimize-geotiff.js';
import fs from 'fs';

const inputPath = 'src/geotiff-optimizer/sample_data/sample.tif';
const outputPath = 'src/geotiff-optimizer/sample_data/sample-cog.tif';

beforeAll(() => {
    // remove output COG (if exists)
    fs.rmSync(outputPath, { force: true });
});

afterAll(() => {
    // remove output COG
    fs.rmSync(outputPath, { force: true });
});

test('optimizeGeoTiff function exists', () => {
    expect(optimizeGeoTiff).toBeDefined();
});

test('Check if COG is being created', async () => {
    await optimizeGeoTiff(inputPath, outputPath);
    const outputExists = fs.existsSync(outputPath);
    expect(outputExists).toBe(true);
});
