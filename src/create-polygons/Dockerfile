FROM node:16-alpine

RUN apk add --update nodejs npm

COPY src/create-polygons/package.json src/create-polygons/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/create-polygons/index.js worker/
COPY src/create-polygons/get-client.js worker/
COPY src/create-polygons/add-to-table.js worker/
COPY src/workerTemplate.js .
COPY src/create-polygons/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
