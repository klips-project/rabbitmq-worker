FROM osgeo/gdal:alpine-small-3.5.3

RUN apk add --update nodejs npm
RUN apk add python3
RUN apk add gdal-tools

COPY src/reclassify-geotiff/package.json src/reclassify-geotiff/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/reclassify-geotiff/index.js worker/
COPY src/reclassify-geotiff/reclassifier.js worker/
COPY src/workerTemplate.js .
COPY src/reclassify-geotiff/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
