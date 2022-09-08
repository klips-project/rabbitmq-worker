process.env.RABBITHOST = '46.4.8.29';
import index from './dispatcher';

test('test if dispatcher can be loaded', () => {
    expect(index).toBeDefined();
});
