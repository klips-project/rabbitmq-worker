const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');

const logAndExit = (msg) => {
  console.error(msg);
  process.exit();
};

const dir = '../data';

const cleanTargetDirectory = (dir) => {
  fs.readdir(dir, (err, files) => {
    if (err) return false;

    for (const file of files) {
      fs.unlink(path.join(dir, file), (err) => {
        if (err) return false;
      });
      return true;
    }
    return true;
  });
};

(async function main() {
  const connection = await amqp
    .connect('amqp://localhost', 'heartbeat=60')
    .catch(logAndExit);
  const channel = await connection.createChannel().catch(logAndExit);
  const queue = 'cleanTargetDirectory_queue';

  channel.assertQueue(queue, {
    durable: true
  });

  channel.consume(
    queue,
    function (msg) {
      msgString = msg.content.toString();
      cleanTargetDirectory(dir);
      console.log(' [x] Directory cleaned: %s', msgString);
      if (msgString === 'finished') {
        return;
      }
      channel.sendToQueue(queue, Buffer.from('finished'), {
        persistent: true
      });
      channel.ack(msg);
    },
    {
      noAck: false
    }
  );
})();
