FROM node:alpine

RUN apk update && apk add zip

COPY src/geoserver-create-imagemosaic-datastore/package.json src/geoserver-create-imagemosaic-datastore/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geoserver-create-imagemosaic-datastore/index.js worker/
COPY src/geoserver-create-imagemosaic-datastore/dummy.tif worker/
COPY src/workerTemplate.js .
COPY src/geoserver-create-imagemosaic-datastore/gs-img-mosaic-tpl ./gs-img-mosaic-tpl
CMD ["./start-worker.sh"]
