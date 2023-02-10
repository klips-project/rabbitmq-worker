import optimizeGeoTiff from './optimize-geotiff.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const baseDir = 'src/geotiff-optimizer/sample_data/'
const originalFilePath = path.join(baseDir, 'sample.tif');
const workingDir = path.join(baseDir, 'tmp/');
const inputPath = path.join(workingDir, 'sample.tif');
const outputPath = path.join(workingDir, 'sample-cog.tif');

beforeAll(() => {
    fs.mkdirSync(workingDir, { recursive: true })
    fs.copyFileSync(originalFilePath, inputPath);
});

afterAll(() => {
    // remove output COG
    fs.rmSync(workingDir, { force: true, recursive: true });
});

test('optimizeGeoTiff function exists', () => {
    expect(optimizeGeoTiff).toBeDefined();
});

test('Check if COG is being created', async () => {
    await optimizeGeoTiff(inputPath, outputPath);
    const outputExists = fs.existsSync(outputPath);
    expect(outputExists).toBe(true);
});

test('Compression Type is set to DEFLATE by default', async () => {
    await optimizeGeoTiff(inputPath, outputPath);

    const cliOutput = execSync(`gdalinfo -json ${outputPath}`);
    const cogInfo = JSON.parse(cliOutput.toString());
    const outCompression = cogInfo['metadata']['IMAGE_STRUCTURE']['COMPRESSION'];
    expect(outCompression).toBe('DEFLATE');
});

test('Compression Type can be set to LZW', async () => {
    const lzwCompression = 'LZW';
    await optimizeGeoTiff(inputPath, outputPath, lzwCompression);

    const cliOutput = execSync(`gdalinfo -json ${outputPath}`);
    const cogInfo = JSON.parse(cliOutput.toString());
    const outCompression = cogInfo['metadata']['IMAGE_STRUCTURE']['COMPRESSION'];
    expect(outCompression).toBe(lzwCompression);
});
