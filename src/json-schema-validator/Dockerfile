FROM node:alpine

COPY src/json-schema-validator/package.json src/json-schema-validator/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/json-schema-validator/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
