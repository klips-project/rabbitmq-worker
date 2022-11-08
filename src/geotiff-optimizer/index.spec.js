process.env.RABBITHOST = '46.4.8.29';
import callbackWorker from './index';
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
