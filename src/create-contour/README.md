# Dataset-Archive worker

### Purpose
Manages archiving of incoming data.

### Mechanism
- Gets array of lines using the contour_polygons-process
- connects to postgres-database
- creates new table in postgres-database (if it does not exist)
- loops through lines and adds them to table

- ToDo: Delete older data
- ToDo: Add worker to publish on geoserver in WFS

### Inputs

1. path to input file in cog webspace (fileUrlOnWebspace)
2. file name (fileNameWithSuffix)
3. Interval

## Example Worker Job JSON

```json
{
    "job": [
      {
        "id": 1,
        "type": "create-contour",
        "inputs": [
            "http://nginx/cog/dresden/dresden_temperature/dresden_20240202T0300Z.tif",
            "dresden_20240202T0300Z.tif",
            "2"
          ]
      }
    ]
}
```
### Developement

#### VS Code Debugger config 

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "envFile": "${workspaceFolder}/.env",
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}/index.js"
        }
    ]
}
```

### Send example job

```bash
cat workflows/create-contour.json | rabbitmqadmin -u rabbit -p rabbit publish exchange=amq.default routing_key=dispatcher
```