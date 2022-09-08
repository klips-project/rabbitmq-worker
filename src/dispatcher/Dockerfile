FROM node:alpine

COPY src/dispatcher/package.json src/dispatcher/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/dispatcher/index.js worker/
COPY src/dispatcher/dispatcher.js worker/
COPY src/workerTemplate.js .

CMD ["./start-worker.sh"]
