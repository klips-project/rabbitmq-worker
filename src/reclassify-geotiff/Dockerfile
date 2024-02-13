FROM osgeo/gdal:ubuntu-small-3.6.2

# netcat needed for 'wait-for' script
RUN apt-get update && apt-get install -y netcat

# build environment needed for installing 'gdal-async'
RUN apt-get install -y build-essential

# install node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt install -y nodejs

COPY src/reclassify-geotiff/package.json src/reclassify-geotiff/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
RUN npm install gdal-async --build-from-source --shared_gdal

COPY src/reclassify-geotiff/index.js worker/
COPY src/reclassify-geotiff/reclassifier.js worker/
COPY src/reclassify-geotiff/worker.js worker/
COPY src/workerTemplate.js .
COPY src/reclassify-geotiff/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
