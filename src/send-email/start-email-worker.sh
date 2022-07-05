#!/bin/sh

# command called externally to be able to use the variables
./wait-for.sh "${RABBITHOST}:5672" -- node worker/index.js ${MAILHOST} ${MAILPORT} ${SECURE} ${AUTHUSER} ${AUTHPASS} ${FROMSENDERNAME} ${FROMSENDEREMAIL}
