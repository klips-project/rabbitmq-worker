# Dataset-Archive worker

### Purpose
Reclassifies geotiffs according to heat levels

### Mechanism

### Inputs

1. path to input file
2. file name (fileNameWithSuffix)
3. levels according to which the GeoTIFF shall be reclassified
4. path to input file in cog webspace (fileUrlOnWebspace)
5. region

## Example Worker Job JSON

```json
{
    "job": [
      {
        "id": 1,
        "type": "reclassify-geotiff",
        "inputs": [
            "/opt/staging/sample.tif",
            "dresden_20240202T0300Z.tif",
            [0, 13, 21, 26, 31, 40, 53],
            "/opt/cog/dresden/dresden_temperature/dresden_20220216T1146Z.tif",
            "dresden"
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
cat workflows/reclassify-geotiff-test.json | rabbitmqadmin -u rabbit -p rabbit publish exchange=amq.default routing_key=dispatcher
```