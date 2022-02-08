FROM node:alpine

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/add-json-to-postgres-table/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
