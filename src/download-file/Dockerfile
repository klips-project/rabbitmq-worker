FROM node:alpine

COPY src/download-file/package.json src/download-file/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/download-file/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
