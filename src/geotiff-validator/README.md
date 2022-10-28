# GeoTIFF Validator

## Worker Configuration

Initially, the worker reads the default configuration file in `./config/config.default.json`. This can be adapted to your needs - see the following list:

**Validation steps:**

|key    | description|
|-----  |------------|
|projection |Allowed projection|
|fileSize |Allowed file size|
|dataType |Allowed data type|
|extent |Allowed extent in EPSG:4326|

**Configuration:**

| key                 | type     | default                          |
|---------------------|----------|----------------------------------|
| allowedEPSGCodes    | Int[]    | [3035,3857,4326]                 |
| allowedExtent       | OlExtent | [[5.85, 47.27],[15.02, 55.07]]   |
| allowedDataTypes    | String[] | ['Int16', 'Float32', 'Float64']  |
| minFilesize         | bytes    | 1000                             |
| maxFilesize         | bytes    | 10000000                         |

**Please note:** Currently the allowed extent check is only working for GeoTIFFs with the following projection: `EPSG:4326`, `EPSG:3857`, `EPSG:3035`.

**Please note:** The defaults will be overwritten by a job input. This enables the worker to validate different use cases (e.g. different datasets within a project).

Example job input:

```json
{
    "extent": {
        "allowedExtent": [
            [
                5.85,
                47.27
            ],
            [
                15.02,
                55.07
            ]
        ]
    },
    "projection": {
        "allowedEPSGCodes": [
            3857,
            4326,
            3035
        ]
    },
    "dataType": {
        "allowedDataTypes": [
            "Byte",
            "Int16",
            "Float32"
        ]
    },
    "fileSize": {
        "minFileSize": 1000,
        "maxFileSize": 10000000
    }
}
```
