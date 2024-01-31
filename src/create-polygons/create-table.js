import { getClient } from './get-client';

// Create table
(async () => {
    const client = await getClient();
    let createTableQuery = `
CREATE TABLE IF NOT EXISTS ${region}_polygons(
  id BIGSERIAL PRIMARY KEY NOT NULL ,
  name varchar,
  timestamp timestamp without timezone,
  geom geometry,
  temp number,
  band int,
);
`;
    const res = await client.query(createTableQuery);
    console.log(`Created table.`);
    console.log(res.rows[0].connected);
    await client.end();
})();