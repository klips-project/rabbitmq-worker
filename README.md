# RabbitMQ Worker

This repository provides a minimal workflow engine based on NodeJS and RabbitMQ. It consists of several `workers` that handle different tasks based on a `job` definition.

A job consists of one or more single tasks, that will be handled sequentially.

Jobs are handled by a main worker, called `dispatcher` (see `src/dispatcher`).

All communication / invoking of workers is done via RabbitMQ messages in different queues.

See the next sections for details.

## Requirements

Development: NodeJS v14 and up is needed

Production: Docker needs to be installed in order to work with the docker images. Workers require environment variables to be set, which can be given e.g. by a docker-compose file or via commandline.

### Example for invoking the dispatcher from commandline:

First do a `npm i` to install dependencies inside a specific worker directory, then issue from the root folder (or adjust the path to the js file)
```
RABBITHOST=localhost RABBITUSER=user RABBITPASS=user WORKERQUEUE=jobs RESULTSQUEUE=results node src/dispatcher/index.js
```
An example for docker can be seen in the next section

## How it works

Consider a job definition given as JSON as described in [job example](#jobexample)

The dispatcher cares about this job by sending messages to several workers which handle individual tasks, reporting errors and determining when a job has completely finished.

It assumes that jobs are sent to a message queue.
The dispatcher receives the job JSON, determines which single tasks it consists of and for every single task, sends a message to a queue that is named equally as the `type` given in a task.

As soon as a worker finishes (with a result or exception), a message will be sent to a results queue (name defaults to `results`). The `dispatcher` picks up these messages and determines if the task succeeded and configures information about the next task.

It will then send a message containing the job and the generated results and information back to the job queue.

The listener on the job queue inspects the job message again and determines if the next task should be called, the job completed or an error occurred.

In case of an error, the job message and the error will be reported to the `DeadLetterQueue`, where the failed jobs can be reviewed later.

Changes to workers are automatically deployed from the `main` branch and published to `ghcr.io/klips-project/mqm-worker/` via Pull Requests.

_Note_: For each additional worker, the file `./src/packagesToBuild.json` file must be extended accordingly.

The desired workers can then be included within a project via Docker Compose as follows:

```text
download-file:
    image: ghcr.io/klips-project/download-file
    volumes:
        - ../data:/home/data:Z
    depends_on:
        - rabbitmq
    environment:
      - RABBITHOST=rabbitmq
      - RABBITUSER=username
      - RABBITPASS=password
      - WORKERQUEUE=download-file
      - RESULTSQUEUE=results
```

Via the mounted directory (`data`) the downloaded files are stored and processed if necessary.

[](#jobexample)
## Job example

An example job used with these workers might look like

```json
{
  "job": [
    {
      "id": 123,
      "type": "download-file",
      "inputs": ["https://example.com/test.txt.gz", "/tmp"]
    },
    {
      "id": 456,
      "type": "gunzip",
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

## Creating a new worker

Please make use of the `templateWorker.js` as seen in the existing workers.

That way you only need to implement your custom handler function.

Make sure to put your responses into the `outputs` of the current worker job.

Furthermore, the name of the new worker must be included in the file `./src/packagesToBuild.json`. The name must not use uppercase letters or spaces and must match the name of the folder.

## Writing tests

Have a look at the existing tests to see how to test a worker. In short:

* name your tests `<file>.spec.js`
* make sure you export the functions you want to test
* make sure to wrap your `initialize` like follows:

```javascript
(async () => {
  try {
    // Initialize and start the worker process
    await initialize(rabbitHost, rabbitUser, rabbitPass, workerQueue, resultQueue, validateGeoTiff);
  } catch (e) {
    log('Error when initializing:', e);
  }
})();
```

Run `npm test` in the root folder to execute the tests.

## Docker Images

The Docker images are built automatically by a GitHub Action. For local development they can be build individually like this:

```shell
# make sure you are in the root of the project
docker image build \
  --file src/dispatcher/Dockerfile \
  --tag dispatcher:my-custom-tag \
  .
```

Alternatively, you can just run `docker compose build` to build all of them.
