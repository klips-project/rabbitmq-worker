process.env.RABBITHOST = '46.4.8.29';
import callbackWorker from './index';

test('if function exists', () => {
    expect(callbackWorker).toBeDefined();
});

test('if worker provides correct outputs', async () => {
    const job = {};
    const outputPath = '/tmp/README.md';
    await callbackWorker(job, [
        'The content',
        outputPath
    ]);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
    expect(job.outputs[0]).toBe(outputPath);
});
