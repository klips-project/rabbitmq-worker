FROM node:alpine

COPY ./package.json ./package-lock.json ./home/
WORKDIR /home
RUN npm install 
COPY ./src/downloadNewDataFromURL/index.js .
CMD ["node", "./index.js"]
