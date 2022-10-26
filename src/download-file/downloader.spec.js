import fs from 'fs';
import downloadFile from './downloader';

test('download function exists', () => {
    expect(downloadFile).toBeDefined();
});

test('if a file can be downloaded', async () => {

    const url = new URL(
        'https://raw.githubusercontent.com/klips-project/rabbitmq-worker/main/README.md'
    );
    const downloadPath = '/tmp/out.md';

    await downloadFile(url, downloadPath);

    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBe(true);
});

test('if it fails on invalid URLs', async () => {
    expect.assertions(1);
    const url = new URL(
        'https://www.example-non-existing.com/non-existing-path'
    );
    const downloadPath = '/tmp/out.md';
    try {
        await downloadFile(url, downloadPath);
    } catch (error) {
        expect(error.code).toBe('ENOTFOUND')
    }
});

test('if it fails if URL does not start with http or https', async () => {
    expect.assertions(1);

    const url = new URL(
        'htp://asdfasdf'
    );
    const downloadPath = '/tmp/out.md';
    try {
        await downloadFile(url, downloadPath);
    } catch (error) {
        expect(error).toBe(`Url does not start with 'http' or 'https'`);
    }

});
