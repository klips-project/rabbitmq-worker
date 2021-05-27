# RabbitMQ Worker

This repository currently provides three different base workers:

- Clean target directory (`cleanTargetDirectory`)
- download sample dataset (`downloadNewDataFromURL`)
- unzip sample dataset (`gunzipDownloadedFile`)

The initialization is done by the command `npm i`.

For each of the tasks the corresponding worker has to be started, e.g. to empty the directory:
`node ./src/cleanTargetDirectory.js`.

Via the client (`send.js`) the queue `cleanTargetDirectory_queue` is addressed by commenting out the corresponding lines to "clean directory". The procedure for the other two workers is identical

The action is initiated by executing this script: `node ./src/send.js` in a second temrinal.
