process.env.RABBITHOST = '46.4.8.29';
import validate from './index';
import download from '../download-file/index';

test('test if geotiff-validate can be loaded', () => {
    expect(validate).toBeDefined();
});

test('test if geotiff-validate can be called', async () => {
    let job = {};
    await download(job, [
        'https://raw.githubusercontent.com/klips-project/klips-sdi/main/mocked-webspace/sample_germany_small.tif',
        'test'
    ]);
    job = {};
    await validate(job, ['test']);
    expect(job.outputs).toBeDefined();
    expect(job.outputs.length).toBe(1);
});
