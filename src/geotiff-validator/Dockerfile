FROM node:bullseye

# netcat needed for 'wait-for' script
RUN apt update \
    && apt install -y gdal-bin netcat

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
COPY util/start-worker.sh /home/start-worker.sh
RUN chmod +x /home/start-worker.sh
COPY util/wait-for.sh /home/wait-for.sh
RUN chmod +x /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geotiff-validator/index.js worker/
COPY src/workerTemplate.js .

CMD ["./start-worker.sh"]
