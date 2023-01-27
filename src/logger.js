import pino from "pino";
import pretty from 'pino-pretty';
import path from 'path';
import fs from 'fs';

const logFilePath = process.env.LOG_FILE_PATH || "./logs/dispatcher.log";

// create directory of log file if it does not exist
if (!fs.existsSync(logFilePath)) {
  const dir = path.dirname(logFilePath);
  fs.mkdirSync(dir, { recursive: true });
}

export const logger = pino(
  {}, // we use the standard logging format
  pino.multistream(
    [
      pretty({ colorize: true }),
      { stream: pino.destination(logFilePath) },
    ]
  )
);
