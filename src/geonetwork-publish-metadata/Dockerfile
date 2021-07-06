FROM node:alpine

ENV GNHOST http://geonetwork:8080/geonetwork/srv/
ENV GNUSER admin
ENV GNPASS admin
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE geonetwork-publish-metadata
ENV RESULTSQUEUE results

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install 
COPY src/geonetwork-publish-metadata/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js ${GNHOST} ${GNUSER} ${GNPASS} ${RABBITHOST} ${WORKERQUEUE} ${RESULTQUEUE}"]
