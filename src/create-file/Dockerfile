FROM node:16-alpine

COPY src/create-file/package.json src/create-file/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/create-file/index.js worker/
COPY src/workerTemplate.js .
COPY src/create-file/child-logger.js worker/
COPY src/logger.js .
CMD ["./start-worker.sh"]
