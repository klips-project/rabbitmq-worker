FROM node:16-alpine

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
COPY src/send-email/start-email-worker.sh util/wait-for.sh /home/
RUN chmod +x /home/start-email-worker.sh /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/send-email/index.js worker/
COPY src/workerTemplate.js .
COPY src/send-email/child-logger.js worker/
COPY src/logger.js .

CMD ["./start-email-worker.sh"]
