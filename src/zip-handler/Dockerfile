FROM node:alpine

COPY src/zip-handler/package.json src/zip-handler/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/zip-handler/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
