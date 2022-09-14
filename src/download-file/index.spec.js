process.env.RABBITHOST = '46.4.8.29';
import download from './index';

test('test if download-file can be loaded', () => {
    expect(download).toBeDefined();
});

test('test if download-file can be called', async () => {
    const job = {};
    await download(job, [
        'https://raw.githubusercontent.com/klips-project/rabbitmq-worker/main/README.md',
        '/tmp/test'
    ]);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
});
