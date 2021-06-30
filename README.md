# RabbitMQ Worker

This repository currently provides two different base workers:

- download sample dataset (`downloadNewDataFromURL`)
- unzip sample dataset (`gunzipFile`)

The initialization is done by the command `npm i`.

The workers are authored to be used as a Docker image in conjunction with a message queue system called RabbitMQ, whose container hostname is `rabbitmq` (`connect('amqp://rabbitmq)'`).

Changes to workers are automatically deployed from the `main` branch and published to `ghcr.io/klips-project/mqm-worker/`.
*Note*: For each additional worker, the `.github/workflows/deploy.yml` file must be extended accordingly.

The desired workers can then be included within a project via Docker Compose as follows:

```text
download-new-data-from-url:
    image: ghcr.io/klips-project/download-new-data-from-url
    volumes:
        - ../data:/home/data:Z
    depends_on:
        - rabbitmq
```

Via the mounted directory (`data`) the downloaded files are stored and processed if necessary.

## Job example

An example Job used with these workers might look like
```
{
    "job": [
        {
            "id": 123,
            "type": "download",
            "inputs": [
              "https://example.com/test.txt.gz"
            ]
        },
        {
            "id": 456,
            "type": "extract",
            "inputs": [
                {
                    "outputOfId": 123,
                    "outputIndex": 0
                }
            ]
        }
    ],
    "emailAddress": "peter@tosh.com"
}
```

## Creatig a new worker
Please make use of the templateWorker.js as seen in the exisiting workers.

That way you only need to implement you custom handler function.

Make sure to put your responses into the "outputs" of the current worker job.
