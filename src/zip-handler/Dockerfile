FROM node:alpine

COPY src/zip-handler/package.json src/zip-handler/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/zip-handler/index.js worker/
COPY src/workerTemplate.js .
COPY src/zip-handler/child-logger.js worker/
COPY src/logger.js .
CMD ["sh", "-c", "node worker/index.js"]
