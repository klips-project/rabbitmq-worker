const pgHost = process.env.POSTGRES_HOST
const pgPort = process.env.POSTGRES_PORT
const pgSchema = process.env.POSTGRES_SCHEMA
const pgDatabase = process.env.POSTGRES_DB
const pgUser = process.env.POSTGRES_USER
const pgPassword = process.env.POSTGRES_PASSWORD

const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    host: pgHost,
    port: pgPort,
    schema: pgSchema,
    user: pgUser,
    password: pgPassword,
    database: pgDatabase,
    ssl: true,
  });
  await client.connect();
  const res = await client.query('SELECT $1::text as connected', ['Connection to postgres successful!']);
  console.log(res.rows[0].connected);
  await client.end();
})();
