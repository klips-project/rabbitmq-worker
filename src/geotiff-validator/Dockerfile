FROM node:bullseye

RUN apt update \
    && apt install -y gdal-bin

COPY src/geotiff-validator/package.json src/geotiff-validator/package-lock.json /home/
COPY  /wait-for.sh /home/wait-for.sh
RUN chmod +x /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/geotiff-validator/index.js worker/
COPY src/workerTemplate.js .
CMD [ "./wait-for.sh", ${RABBITHOST}":15672", "--", "sh", "-c", "node worker/index.js"]

