FROM node:alpine

COPY src/create-file/package.json src/create-file/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/create-file/index.js worker/
COPY src/workerTemplate.js .
CMD ["./start-worker.sh"]
