FROM node:bullseye

# netcat needed for 'wait-for' script
RUN apt update \
    && apt install -y gdal-bin netcat

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
COPY util/start-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geotiff-validator/index.js worker/
COPY src/geotiff-validator/config.yml .
COPY src/workerTemplate.js .

CMD ["./start-worker.sh"]
