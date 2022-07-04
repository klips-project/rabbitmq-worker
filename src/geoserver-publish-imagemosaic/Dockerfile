FROM node:alpine

COPY src/geoserver-publish-imagemosaic/package.json src/geoserver-publish-imagemosaic/package-lock.json /home/

COPY util/start-worker.sh /home/start-worker.sh
RUN chmod +x /home/start-worker.sh
COPY util/wait-for.sh /home/wait-for.sh
RUN chmod +x /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geoserver-publish-imagemosaic/index.js worker/
COPY src/workerTemplate.js .
CMD ["./start-worker.sh"]
