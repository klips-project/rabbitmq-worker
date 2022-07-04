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
COPY src/send-email/start-email-worker.sh /home/start-email-worker.sh
RUN chmod +x /home/start-email-worker.sh
COPY util/wait-for.sh /home/wait-for.sh
RUN chmod +x /home/wait-for.sh

WORKDIR /home/
RUN npm install
COPY src/send-email/index.js worker/
COPY src/workerTemplate.js .

CMD ["./start-email-worker.sh"]
