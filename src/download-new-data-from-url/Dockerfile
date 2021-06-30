FROM node:alpine

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install 
COPY src/download-new-data-from-url/index.js worker/
COPY src/workerTemplate.js .
CMD ["node", "worker/index.js"]
