# Dataset-Rotation worker

### Purpose
Manages rotation mechanism of incoming datasets.

### Mechanism
- Check if incoming dataset has the same timestamp as current timestamp (rounded to current hour).
  If yes:
   Delete previous dataset of index -48.
   - This dataset shall be the oldest one in the directory
   - This dataset is -49hours before the current one.
- Copy incoming dataset to target directory, replace existing dataset of the same name

### Inputs

1. path to input file
2. path to cog webspace (needed to delete the oldest dataset)

### Example Worker Job JSON

```json
{
    "job": [
      {
        "id": 1,
        "type": "dataset-rotation",
        "inputs": [
            "/opt/staging/langenfeld_20230628T1200Z.tif",
            "/opt/cog"
          ]
      }
    ]
}
```