FROM node:alpine

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geotiff-validator/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
