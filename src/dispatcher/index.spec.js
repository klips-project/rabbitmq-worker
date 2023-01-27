process.env.RABBITHOST = '46.4.8.29';
import {Dispatcher} from './dispatcher';

test('if dispatcher class exists', () => {
    expect(Dispatcher).toBeDefined();
});
