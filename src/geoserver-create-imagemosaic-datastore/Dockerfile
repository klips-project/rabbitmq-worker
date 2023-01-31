FROM node:16-alpine

RUN apk update && apk add zip

COPY src/geoserver-create-imagemosaic-datastore/package.json src/geoserver-create-imagemosaic-datastore/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geoserver-create-imagemosaic-datastore/index.js worker/
COPY src/geoserver-create-imagemosaic-datastore/util.js worker/
COPY src/geoserver-create-imagemosaic-datastore/create-mosaic-store.js worker/
COPY src/geoserver-create-imagemosaic-datastore/geoserver-config-templates.js worker/
COPY src/workerTemplate.js .
COPY src/geoserver-create-imagemosaic-datastore/child-logger.js worker/
COPY src/logger.js .

CMD ["./start-worker.sh"]
