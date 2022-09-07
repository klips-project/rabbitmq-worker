process.env.RABBITHOST = '46.4.8.29';
import index from './index';

test('test if download-file can be loaded', () => {
    expect(index).toBeDefined();
});
