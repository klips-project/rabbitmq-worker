import { getClient } from './get-client';
import logger from './child-logger.js';

// Add data to table
export const addData = async (
    datasetTimestamp,
    polygon,
    region
) => {
    // Check if polygon object contains all necessary properties
    if (!('geom' in polygon)) {
        // timestamp of dataset not valid
        logger.error('Object is missing geometry');
        throw 'Object is missing geometry.';
    }

    if (!('temp' in polygon)) {
        // timestamp of dataset not valid
        logger.error('Object is missing temperature value');
        throw 'Object is missing temperature value.';
    }

    if (!('band' in polygon)) {
        // timestamp of dataset not valid
        logger.error('Object is missing band');
        throw 'Object is missing band.';
    }

    // Add to table
    const client = await getClient();
    // TODO process.argv can potentially be removed
    const timestamp = process.argv[2] ?? datasetTimestamp;
    const geom = process.argv[2] ?? polygon.geom;
    const temp = process.argv[2] ?? polygon.temp;
    const band = process.argv[2] ?? polygon.band;
    let insertRow = await client.query(`INSERT INTO ${region}_polygons(timestamp, ST_GeomFromGeoJSON(geom), temp, band) VALUES($1);`, [timestamp, geom, temp, band]);
    console.log(`Inserted ${insertRow.rowCount} row`);
    await client.end();
};