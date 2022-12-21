import { createMosaicStore } from "./create-mosaic-store.js";
import { GeoServerRestClient } from 'geoserver-node-client';

const url = 'http://localhost:8080/geoserver/rest';

const user = 'klips';
const pw = 'klips';

const pgConf = {
  host: 'postgres',
  port: 5432,
  schema: 'public',
  user: 'postgres',
  password: 'postgres',
  database: 'klips'
};

const ws = 'dresden';

const grc = new GeoServerRestClient(url, user, pw);

createMosaicStore(grc, ws, 'cog-store', undefined, undefined, pgConf, 'cog');
