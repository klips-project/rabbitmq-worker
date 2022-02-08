import { log, initialize } from '../workerTemplate.js';
import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const workerQueue = process.env.WORKERQUEUE;
const resultQueue = process.env.RESULTSQUEUE;
const rabbitHost = process.env.RABBITHOST;
const rabbitUser = process.env.RABBITUSER;
const rabbitPass = process.env.RABBITPASS;

if (
  !process.env.PGUSER ||
  !process.env.PGPASSWORD ||
  !process.env.PGHOST ||
  !process.env.PGPORT ||
  !process.env.PGDATABASE
) {
  errorAndExit('PostgreSQL environment variables must be provided:' +
  '\nPGUSER\nPGPASSWORD\nPGHOST\nPGPORT\nPGDATABASE')
}

/**
 * NOTE: This worker is for demonstration only so far. It requires a table in the database with this structure:

  CREATE TABLE public.dummy (
    id SERIAL PRIMARY KEY,
    "json" json,
    geom geometry(point, 4326)
  );

 */

/**
 * Reads JSON file from disk and inserts it in a DB table
 *
 * @param {Object} workerJob The job object
 * @param {Array} inputs The inputs for this process
 *   First input is the name of the table to insert
 *   Second input is the path of the JSON to insert
 * @example
 {
  "job": [
    {
       "id": 123,
       "type": "json-to-postgres-table",
       "inputs": ['dummy','/path/to/json']
    }
  ]
}
 */
const addJsonToPostgresTable = async (workerJob, inputs) => {

  const table = inputs[0];
  const jsonPath = inputs[1];

  // load data and check if it is a valid JSON
  let rawData, data, jsonAsString;
  try {
    rawData = fs.readFileSync(jsonPath);
    data = JSON.parse(rawData);
    jsonAsString = JSON.stringify(data);
  } catch (error) {
    throw 'Reading JSON from disk failed'
  }

  try {
    const client = new Client()
    await client.connect()
    let sql = `INSERT INTO ${table} (json, geom) VALUES (
        '${jsonAsString}'::json,
        ST_SetSRID(ST_MakePoint(7.2, 42.3), 4326)
      )`;
    await client.query(sql);

    log('Successfully inserted JSON')
    await client.end()
  } catch (error) {
    throw 'Inserting JSON failed'
  }
  workerJob.status = 'success';
  workerJob.outputs = [];
};

// Initialize and start the worker process
initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, addJsonToPostgresTable);
