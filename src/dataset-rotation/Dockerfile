FROM node:16-alpine

RUN apk add --update nodejs npm

COPY src/dataset-rotation/package.json src/dataset-rotation/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/dataset-rotation/index.js worker/
COPY src/workerTemplate.js .
COPY src/dataset-rotation/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
