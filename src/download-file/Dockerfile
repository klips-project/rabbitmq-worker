FROM node:16-alpine

COPY src/download-file/package.json src/download-file/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/download-file/index.js worker/
COPY src/download-file/downloader.js worker/
COPY src/download-file/child-logger.js worker/
COPY src/logger.js .
COPY src/workerTemplate.js .
CMD ["./start-worker.sh"]
