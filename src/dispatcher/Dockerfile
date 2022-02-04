FROM node:alpine

COPY src/dispatcher/package.json src/dispatcher/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/dispatcher/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
