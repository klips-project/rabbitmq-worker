FROM node:alpine

COPY src/geoserver-publish-imagemosaic/package.json src/geoserver-publish-imagemosaic/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-imagemosaic/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
