const classicIndexer = `
Schema=*the_geom:Polygon,location:String,ts:java.util.Date
PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](ts)
TimeAttribute=ts
Recursive=false
CanBeEmpty=true
Wildcard=*.tif
Name=__NAME__
`;

const classicTimeRegex = `regex=[0-9]{8}T[0-9]{4}Z`;

const classicDatastore = `
SPI=org.geotools.data.postgis.PostgisNGDataStoreFactory
host=__DATABASE_HOST__
port=__DATABASE_PORT__
database=__DATABASE_NAME__
schema=__DATABASE_SCHEMA__
user=__DATABASE_USER__
passwd=__DATABASE_PASSWORD__
Loose\ bbox=true
Estimated\ extends=false
validate\ connections=true
Connection\ timeout=10
preparedStatements=true
`;

export const classicConfigFiles = {
  indexer: classicIndexer,
  timeregex: classicTimeRegex,
  datastore: classicDatastore
};

const cogIndexer = `
Cog=true
PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](time)
TimeAttribute=time
Schema=*the_geom:Polygon,location:String,time:java.util.Date
CanBeEmpty=true
Name=__NAME__
`;

const cogTimeRegex =  `regex=[0-9]{8}T[0-9]{4}Z`;

const cogDatastore = `
SPI=org.geotools.data.postgis.PostgisNGDataStoreFactory
host=__DATABASE_HOST__
port=__DATABASE_PORT__
database=__DATABASE_NAME__
schema=__DATABASE_SCHEMA__
user=__DATABASE_USER__
passwd=__DATABASE_PASSWORD__
Loose\ bbox=true
Estimated\ extends=false
validate\ connections=true
Connection\ timeout=10
preparedStatements=true
url=jdbc\\:postgresql\\:__DATABASE_NAME__
driver=org.postgresql.Driver
fetch\ size=1000
max\ connections=20
min\ connections=5
validate\ connections=true
Loose\ bbox=true
Expose\ primary\ key=false
Max\ open\ prepared\ statements=50
preparedStatements=false
Estimated\ extends=false
Connection\ timeout=20
`;

export const cogConfigFiles = {
  indexer: cogIndexer,
  timeregex: cogTimeRegex,
  datastore: cogDatastore
};