FROM node:alpine

ENV GSHOST http://localhost:8080/geoserver/rest/
ENV GSUSER admin
ENV GSPASS geoserver
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE geoserver-publish-sld
ENV RESULTSQUEUE results

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install 
COPY src/geoserver-publish-sld/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js ${GSHOST} ${GSUSER} ${GSPASS} ${RABBITHOST} ${RABBITUSER} ${RABBITPASS} ${WORKERQUEUE} ${RESULTQUEUE}"]
