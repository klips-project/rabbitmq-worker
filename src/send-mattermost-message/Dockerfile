FROM node:alpine

COPY src/send-mattermost-message/package.json src/send-mattermost-message/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/send-mattermost-message/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
