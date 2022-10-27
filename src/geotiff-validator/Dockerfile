FROM node:16-bullseye

# netcat needed for 'wait-for' script
RUN apt update \
    && apt install -y gdal-bin netcat

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geotiff-validator/index.js worker/
COPY src/workerTemplate.js .
ADD src/geotiff-validator/config worker/config

CMD ["./start-worker.sh"]
