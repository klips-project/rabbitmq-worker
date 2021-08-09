FROM node:alpine

ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE process-ciss-shop-data
ENV RESULTSQUEUE results

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install 
COPY src/process-ciss-shop-data/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js ${RABBITHOST} ${WORKERQUEUE} ${RESULTQUEUE}"]
