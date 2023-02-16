/**
 * Shared configuration for the unit tests.
 */

const sampleConfig = {
  extent: {
    allowedExtent: [
      [
        1,
        1
      ],
      [
        89,
        89
      ]
    ]
  },
  projection: {
    allowedEPSGCodes: [
      4326,
    ]
  },
  dataType: {
    allowedDataTypes: [
      "Byte",
      "Float32"
    ]
  },
  fileSize: {
    minFileSize: 1000,
    maxFileSize: 10000000
  },
  bandCount: {
    expectedCount: 4
  },
  noDataValue: {
    expectedValue: 42
  },
  valueRange: {
    expectedBandRanges: [
      { min: 230, max: 255 },
      { min: 229, max: 255 },
      { min: 219, max: 255 },
      { min: 255, max: 255 }
    ]
  }
};

export { sampleConfig };
