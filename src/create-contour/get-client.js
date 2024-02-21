// Connect to databse

import pkg from 'pg';
const { Client } = pkg
import dotenv from 'dotenv'
dotenv.config();

const pgHost = process.env.POSTGRES_HOST;
const pgPort = process.env.POSTGRES_PORT;
const pgDatabase = process.env.POSTGRES_DB;
const pgUser = process.env.POSTGRES_USER;
const pgPassword = process.env.POSTGRES_PASSWORD;

export const getClient = async () => {
  const client = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: pgDatabase,
  });
  await client.connect();
  return client;
};
