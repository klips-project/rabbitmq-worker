FROM node:alpine

COPY src/dispatcher/package.json src/dispatcher/package-lock.json /home/

COPY util/start-worker.sh /home/start-worker.sh
RUN chmod +x /home/start-worker.sh
COPY util/wait-for.sh /home/wait-for.sh
RUN chmod +x /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/dispatcher/index.js worker/
COPY src/workerTemplate.js .

CMD ["./start-worker.sh"]
