# RabbitMQ Worker

This repository currently provides two different base workers:

- download sample dataset (`downloadNewDataFromURL`)
- unzip sample dataset (`gunzipFile`)

The initialization is done by the command `npm i`.

The workers are authored to be used as a Docker image in conjunction with a message queue system called RabbitMQ, whose container hostname is `rabbitmq` (`connect('amqp://rabbitmq)'`).

Changes to workers are automatically deployed from the `main` branch and published to `nexus.terrestris.de`.
*Note*: For each additional worker, the `.github/workflows/actions.yml` file must be extended accordingly.

The desired workers can then be included within a project via Docker Compose as follows:

```text
download-new-data-from-url:
    image: nexus.terrestris.com/terrestris/mqm-worker/download-new-data-from-url
    volumes:
        - ../data:/home/data:Z
    depends_on:
        - rabbitmq
```

Via the mounted directory (`data`) the downloaded files are stored and processed if necessary.
