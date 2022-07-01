FROM node:alpine

COPY src/geoserver-publish-geotiff/package.json src/geoserver-publish-geotiff/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-geotiff/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js"]
