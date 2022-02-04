FROM node:alpine

ENV MAILHOST mail.organization.org
ENV MAILPORT 587
ENV SECURE false
ENV AUTHUSER no-reply@organization.org
ENV AUTHPASS 🔑
ENV FROMSENDERNAME No Reply Organization
ENV FROMSENDEREMAIL no-reply@organization.org
ENV RABBITHOST amqp://rabbitmq
ENV WORKERQUEUE send-email
ENV RESULTSQUEUE results

COPY src/send-email/package.json src/send-email/package-lock.json /home/
WORKDIR /home/
RUN npm install
COPY src/send-email/index.js worker/
COPY src/workerTemplate.js .
CMD ["sh", "-c", "node worker/index.js ${MAILHOST} ${MAILPORT} ${SECURE} ${AUTHUSER} ${AUTHPASS} ${FROMSENDERNAME} ${FROMSENDEREMAIL}"]
