#!/bin/sh

# command called externally to be able to use the variable 'RABBITHOST'
./wait-for.sh "${RABBITHOST}:5672" -- node worker/index.js
