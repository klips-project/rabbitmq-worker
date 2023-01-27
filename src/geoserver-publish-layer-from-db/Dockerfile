FROM node:alpine

ENV GSHOST http://localhost:8080/geoserver/rest/
ENV GSUSER admin
ENV GSPASS geoserver
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE geoserver-publish-layer-from-db
ENV RESULTSQUEUE results

COPY src/geoserver-publish-layer-from-db/package.json src/geoserver-publish-layer-from-db/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-layer-from-db/index.js worker/
COPY src/workerTemplate.js .
COPY src/geoserver-publish-layer-from-db/child-logger.js worker/
COPY src/logger.js .
CMD ["sh", "-c", "node worker/index.js ${GSHOST} ${GSUSER} ${GSPASS}"]
