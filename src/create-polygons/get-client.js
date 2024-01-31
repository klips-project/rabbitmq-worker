// Connect to databse
const pgHost = process.env.POSTGRES_HOST
const pgPort = process.env.POSTGRES_PORT
const pgSchema = process.env.POSTGRES_SCHEMA
const pgDatabase = process.env.POSTGRES_DB
const pgUser = process.env.POSTGRES_USER
const pgPassword = process.env.POSTGRES_PASSWORD

const { Client } = require('pg');
require('dotenv').config();

module.exports.getClient = async () => {
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
  return client;
};
