FROM osgeo/gdal:alpine-small-3.5.3

RUN apk add --update nodejs npm

COPY src/geotiff-optimizer/package.json src/geotiff-optimizer/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geotiff-optimizer/index.js worker/
COPY src/geotiff-optimizer/optimize-geotiff.js worker/
COPY src/workerTemplate.js .
CMD ["./start-worker.sh"]
