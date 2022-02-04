FROM node:alpine

COPY src/upload-file/package.json src/upload-file/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/upload-file/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
