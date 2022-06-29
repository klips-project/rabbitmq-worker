FROM node:bullseye

COPY src/geoserver-publish-imagemosaic-layer/package.json src/geoserver-publish-imagemosaic-layer/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geotiff-geoserver-publish-imagemosaic-layer/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
