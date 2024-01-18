FROM osgeo/gdal:alpine-small-3.5.3

RUN apk add --update nodejs npm

ENV GSHOST http://localhost:8080/geoserver/rest/
ENV GSUSER admin
ENV GSPASS geoserver
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE geoserver-create-and-apply-sld
ENV RESULTSQUEUE results

COPY src/geoserver-create-and-apply-sld/package.json src/geoserver-create-and-apply-sld/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geoserver-create-and-apply-sld/index.js worker/
COPY src/workerTemplate.js .
COPY src/geoserver-create-and-apply-sld/child-logger.js worker/
COPY src/logger.js .
CMD ["sh", "-c", "node worker/index.js ${GSHOST} ${GSUSER} ${GSPASS}"]
