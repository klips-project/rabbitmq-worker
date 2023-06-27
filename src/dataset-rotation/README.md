# Dataset-Rotation worker

### Purpose
Manages rotation mechanism of incoming datasets.

### Mechanism
- Check if incoming dataset is the same as current timestep (rounded to current hour).
  If yes:
1. move previous dataset with the timestep to archive.
2. Delete previous dataset of index -48.
   - This dataset shall be the "oldest" one in the directory
   - This dataset is -48hours before the current one.
- Copy incoming dataset to target directory, replace existing dataset of the same name

