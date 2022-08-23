FROM node:alpine

RUN apk update && apk add zip

COPY src/geoserver-publish-imagemosaic/package.json src/geoserver-publish-imagemosaic/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-imagemosaic/index.js worker/
COPY src/workerTemplate.js .
COPY src/geoserver-publish-imagemosaic/gs-img-mosaic-tpl ./gs-img-mosaic-tpl
CMD ["./start-worker.sh"]
