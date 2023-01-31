FROM node:16-alpine

COPY src/gunzip-file/package.json src/gunzip-file/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/gunzip-file/index.js worker/
COPY src/workerTemplate.js .
COPY src/gunzip-file/child-logger.js worker/
COPY src/logger.js .
CMD ["sh", "-c", "node worker/index.js"]
