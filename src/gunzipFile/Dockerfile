FROM node:alpine

RUN apk update && apk add bash
COPY ./package.json ./package-lock.json ./home/
WORKDIR /home
RUN npm install 
COPY ./src/gunzipFile/index.js .
CMD ["node", "./index.js"]
