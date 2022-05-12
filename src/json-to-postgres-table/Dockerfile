FROM node:alpine

COPY src/json-to-postgres-table/package.json src/json-to-postgres-table/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/json-to-postgres-table/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
