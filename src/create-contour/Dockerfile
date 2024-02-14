FROM osgeo/gdal:alpine-small-3.5.3

RUN apk add --update nodejs npm

COPY src/geoserver-create-and-apply-sld/package.json src/geoserver-create-and-apply-sld/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
RUN npm install dayjs
RUN npm install dotenv
COPY src/create-contour/index.js worker/
COPY src/create-contour/get-client.js worker/
COPY src/create-contour/add-to-table.js worker/
COPY src/create-contour/contour.js worker/
COPY src/workerTemplate.js .
COPY src/create-contour/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
