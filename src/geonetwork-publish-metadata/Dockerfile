FROM node:16-alpine

ENV GNHOST http://geonetwork:8080/geonetwork/srv/
ENV GNUSER admin
ENV GNPASS admin
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE geonetwork-publish-metadata
ENV RESULTSQUEUE results

COPY src/geonetwork-publish-metadata/package.json src/geonetwork-publish-metadata/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geonetwork-publish-metadata/index.js worker/
COPY src/geonetwork-publish-metadata/child-logger.js worker/
COPY src/workerTemplate.js .
COPY src/gnos-client.js .

CMD ["sh", "-c", "node worker/index.js ${GNHOST} ${GNUSER} ${GNPASS}"]
