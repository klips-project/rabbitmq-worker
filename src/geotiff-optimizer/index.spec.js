import callbackWorker from './index';
import fs from 'fs';
import path from 'path';

const baseDir = 'src/geotiff-optimizer/sample_data/'
const originalFilePath = path.join(baseDir, 'sample.tif');
const workingDir = path.join(baseDir, 'tmp/');
const inputPath = path.join(workingDir, 'sample.tif');
const outputPath = path.join(workingDir, 'sample-cog.tif');

beforeAll(() => {
    fs.mkdirSync(workingDir, {recursive: true})
    fs.copyFileSync(originalFilePath, inputPath);
});

afterAll(() => {
    // remove output COG
    fs.rmSync(workingDir, { force: true, recursive: true });
});

test('if function exists', () => {
    expect(callbackWorker).toBeDefined();
});

test('if worker provides correct outputs', async () => {
    const job = {};
    await callbackWorker(job, [
        inputPath,
        outputPath
    ]);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
    expect(job.outputs[0]).toBe(outputPath);

    const outputExists = fs.existsSync(outputPath);
    expect(outputExists).toBe(true);
});
