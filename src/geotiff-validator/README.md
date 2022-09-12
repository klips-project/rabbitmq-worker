# GeoTIFF Validator

## Configuration

Provide a `config.yaml` with the follwing keys and adapt it to your needs.

| key                 | mandatory | type     | default                          |
|---------------------|-----------|----------|----------------------------------|
| allowedEPSGCodes: [ | y         | Int[]    | [3035,3857,4326]                 |
| allowedExtent       | y         | OlExtent | [[5.85, 47.27],[15.02, 55.07]]   |
| allowedDataTypes    | n         | String[] | ['Byte','Int16','Float32']       |
| minFilesize         | n         | bytes    | 1000                             |
| maxFilesize         | n         | bytes    | 10000000                         |

Example:

```
allowedEPSGCodes: [
  '3857',
  '4326',
  '3035'
]
allowedExtent: [
  [
    5.85,
    47.27,
  ],
  [
    15.02,
    55.07
  ]
]
allowedDataTypes: [
  'Byte',
  'Int16',
  'Float32'
]
minFilesize: 1000
maxFilesize: 10000000

```