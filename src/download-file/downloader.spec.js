import fs from 'fs';
import { downloadFile, callbackWorker } from './downloader';

describe('downloadFile', () => {

    it('can download a file', async () => {

        const url = new URL(
            'https://raw.githubusercontent.com/klips-project/rabbitmq-worker/main/README.md'
        );
        const downloadPath = '/tmp/out.md';

        await downloadFile(url, downloadPath);

        const fileExists = fs.existsSync(downloadPath);
        expect(fileExists).toBe(true);
    });

    it('fails on invalid URLs', async () => {
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

    it('fails if URL does not start with http or https', async () => {
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
});

describe('callbackWorker', () => {
    it('exists', () => {
        expect(callbackWorker).toBeDefined();
    });

    it('provides correct outputs', async () => {
        const job = {};
        const outputPath = '/tmp/README.md';
        await callbackWorker(job, [
            'https://raw.githubusercontent.com/klips-project/rabbitmq-worker/main/README.md',
            outputPath
        ]);
        expect(job.outputs).toBeDefined();
        expect(job.outputs.length).toBe(1);
        expect(job.outputs[0]).toBe(outputPath);
    });
});
