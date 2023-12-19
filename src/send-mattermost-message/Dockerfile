FROM node:16-alpine

COPY src/send-mattermost-message/package.json src/send-mattermost-message/package-lock.json /home/

COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/send-mattermost-message/index.js worker/
COPY src/workerTemplate.js .

COPY src/send-mattermost-message/child-logger.js worker/
COPY src/logger.js .

HEALTHCHECK CMD pgrep node || exit 1

CMD ["./start-worker.sh"]
