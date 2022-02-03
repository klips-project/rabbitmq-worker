FROM node:alpine

COPY ./package.json ./package-lock.json /home/
WORKDIR /home/
RUN npm install 
COPY src/upload-file/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js ${RABBITHOST} ${RABBITUSER} ${RABBITPASS} ${WORKERQUEUE} ${RESULTQUEUE}"]
