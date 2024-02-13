FROM osgeo/gdal:ubuntu-small-3.6.2

# netcat needed for 'wait-for' script
RUN apt-get update && apt-get install -y netcat

# build environment needed for installing 'gdal-async'
RUN apt-get install -y build-essential
RUN apt-get install python-gdal

# install node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt install -y nodejs

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
RUN npm install gdal-async --build-from-source --shared_gdal

COPY src/geotiff-validator/index.js worker/
COPY src/geotiff-validator/validator.js worker/
COPY src/geotiff-validator/worker.js worker/
COPY src/workerTemplate.js .
COPY src/geotiff-validator/child-logger.js worker/
COPY src/logger.js .
ADD src/geotiff-validator/config config

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
