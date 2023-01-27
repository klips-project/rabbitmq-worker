# Dispatcher Worker

## Logging

The dispatcher writes JSON-structured logs using the the Pino library to the path defined with the environment variable `LOG_FILE_PATH`.

The logs can be viewed with a texteditor, but it is easier to read the with the tool `pino-pretty`(installation with `npm i -g pino-pretty`). Examples:

```shell
# show all logs with colors
tail -f dispatcher.log | pino-pretty -c

# show at least level "warn"
tail -f dispatcher.log | pino-pretty -c -L warn

# ignore the 'job' property, because it is very verbose
tail -f dispatcher.log | pino-pretty -c -i job

# print single lines
tail -f dispatcher.log | pino-pretty -c -S
```

## logrotate

In a production environment the log files can grow to a huge size and might crash the system. The unix tool `logrotate` is useful for splitting one log file in many files or deleting very old log files.
