import { getClient } from './get-client.js';
import logger from './child-logger.js';

// Add data to table
export const addData = async (
    datasetTimestamp,
    contourLine,
    region
) => {
    // Check if line-vector contains all necessary properties
    if (!('geometry' in contourLine)) {
        // timestamp of dataset not valid
        logger.error('Object is missing geometry');
        throw 'Object is missing geometry.';
    }

    if (!('properties' in contourLine)) {
        // timestamp of dataset not valid
        logger.error('Object is missing properties');
        throw 'Object is missing properties.';
    }

    // Add to table
    let client;
    try {
        client = await getClient();
        // TODO process.argv can potentially be removed
        const timestamp = process.argv[2] ?? datasetTimestamp;
        const geom = process.argv[2] ?? contourLine.geometry;
        const temp = process.argv[2] ?? contourLine.properties.TEMP;
        let insertRow = await client.query(`INSERT INTO ${region}_contourLines(timestamp, geom, temperature) VALUES(${timestamp}, ${geom}, ${temp});`);
        logger.info(`Inserted ${insertRow.rowCount} row`);
    } catch (e) {
        logger.error(e);
        throw 'SQL execution aborted: ' + e;
    } finally {
        if (client) {
            await client.end();
        }
    }
};
