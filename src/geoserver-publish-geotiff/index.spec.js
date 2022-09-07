process.env.RABBITHOST = '46.4.8.29';
process.env.GEOSERVER_REST_URL = 'http://46.4.8.29:8080/geoserver/';
import index from './index';

test('test if geoserver-publish-geotiff can be loaded', () => {
    expect(index).toBeDefined();
});
