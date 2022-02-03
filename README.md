# RabbitMQ Worker

This repository provides several workers, e.g:

- download sample dataset (`download-new-data-from-url`)
- unzip sample dataset (`gunzip-file`)
- geoserver publish SLD (`geoserver-publish-sld`)
- send email (`send-email`)

The initialization is done by the command `npm i`.
Some workers require environment variables to be set, which can be given e.g. by a docker-compose file.
See the worker definition for the required variables.

## Requirements

NodeJS v14 and up is needed

## How it works

The workers are authored to be used as a Docker image in conjunction with a message queue system called RabbitMQ, whose container hostname is `rabbitmq` (`connect('amqp://rabbitmq)'`).

Changes to workers are automatically deployed from the `main` branch and published to `ghcr.io/klips-project/mqm-worker/`.
_Note_: For each additional worker, the file `./src/packagesToBuild.json` file must be extended accordingly.

The desired workers can then be included within a project via Docker Compose as follows:

```text
download-new-data-from-url:
    image: ghcr.io/klips-project/download-new-data-from-url
    volumes:
        - ../data:/home/data:Z
    depends_on:
        - rabbitmq
    environment:
      - RABBITHOST=rabbitmq
      - RABBITUSER=username
      - RABBITPASS=password
      - WORKERQUEUE=download-new-data-from-url
      - RESULTSQUEUE=results
```

Via the mounted directory (`data`) the downloaded files are stored and processed if necessary.

## Job example

An example Job used with these workers might look like

```json
{
  "job": [
    {
      "id": 123,
      "type": "download",
      "inputs": ["https://example.com/test.txt.gz"]
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
    },
    {
      "id": 789,
      "type": "geoserver-publish-sld",
      "inputs": [
        "<?xml version='1.0' encoding='UTF-8'?><StyledLayerDescriptor version='1.0.0'  xsi:schemaLocation='http://www.opengis.net/sld StyledLayerDescriptor.xsd'  xmlns='http://www.opengis.net/sld'  xmlns:ogc='http://www.opengis.net/ogc'  xmlns:xlink='http://www.w3.org/1999/xlink'  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'> <NamedLayer> <Name>default_line</Name> <UserStyle> <Title>Default Line</Title> <Abstract>A sample style that draws a line</Abstract> <FeatureTypeStyle> <Rule> <Name>rule1</Name> <Title>Blue Line</Title> <Abstract>A solid blue line with a 1 pixel width</Abstract> <LineSymbolizer> <Stroke> <CssParameter name='stroke'>#0000FF</CssParameter> </Stroke> </LineSymbolizer> </Rule> </FeatureTypeStyle> </UserStyle> </NamedLayer></StyledLayerDescriptor>",
        "simplePointStyle",
        "defaultWorkspace"
      ]
    },
    {
      "id": 1001,
      "type": "send-email",
      "inputs": ["to@recipient.org", "subject", "content"]
    }
  ]
}
```

## Creatig a new worker

Please make use of the templateWorker.js as seen in the existing workers.

That way you only need to implement your custom handler function.

Make sure to put your responses into the "outputs" of the current worker job.

Furthermore, the name of the new worker must be included in the file `./src/packagesToBuild.json`. The name must not use uppercase letters or spaces and must match the name of the folder.

## Docker Images

The Docker images are built automatically by the GitHub CI. For local development they can be build individually like this:

```shell
# make sure you are in the root of the project
docker image build \
  --file src/dispatcher/Dockerfile \
  --tag dispatcher:my-custom-tag \
  .
```
