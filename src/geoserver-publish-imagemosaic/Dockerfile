FROM node:16-alpine

COPY src/geoserver-publish-imagemosaic/package.json src/geoserver-publish-imagemosaic/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-imagemosaic/index.js worker/
COPY src/geoserver-publish-imagemosaic/publish-granule.js worker/
COPY src/workerTemplate.js .
COPY src/geoserver-publish-imagemosaic/child-logger.js worker/
COPY src/logger.js .
CMD ["./start-worker.sh"]
