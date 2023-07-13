# Dataset-Archive worker

### Purpose
Manages archiving of incoming data.

### Mechanism
- Check if incoming dataset has the same timestamp as current timestamp (rounded to current hour).
  If yes:
  - Check if archive directory (/opt/cog/archive) exists
    If no:
    - create directory
  - Copy incoming dataset to archive.

ToDo: Copy to external archive (currently copying to directory)

### Inputs

1. path to input file
2. path to cog webspace

## Example Worker Job JSON

```json
{
    "job": [
      {
        "id": 1,
        "type": "dataset-archive",
        "inputs": [
            "/opt/staging/langenfeld_20230628T1200Z.tif",
            "/opt/cog"
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
