# GeoTIFF Validator

## Worker Configuration

Initially, the worker reads the default configuration file in `./config/config.default.yml`. This can be adapted to your needs - see the following list:

| key                 | type     | default                          |
|---------------------|----------|----------------------------------|
| allowedEPSGCodes    | Int[]    | [3035,3857,4326]                 |
| allowedExtent       | OlExtent | [[5.85, 47.27],[15.02, 55.07]]   |
| allowedDataTypes    | String[] | ['Byte','Int16','Float32']       |
| minFilesize         | bytes    | 1000                             |
| maxFilesize         | bytes    | 10000000                         |

**Please note:** The defaults will be overwritten by a job input. This enables the worker to validate different use cases (e.g. different datasets within a project).

Example job input:

```
{
    "job": [
        {
            "id": 2,
            "type": "geotiff-validator",
            "inputs": [
                "/opt/geoserver_data/sample.tif",
                {
                    "validationSteps": [
                        "projection"
                    ],
                    "config": {
                        "allowedEPSGCodes": [
                            3035,
                            25833
                          ],
                        "allowedDataTypes" :  [
                            "float"
                        ]
                    }
                }
            ]
        }
    ]
}
```