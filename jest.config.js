module.exports = {
  "preset": "ts-jest",
  "globals": {
    "ts-jest": {
      "diagnostics": false
    }
  },
  "reporters": [
    "default",
    "@unional/jest-progress-reporter",
    "jest-audio-reporter"
  ],
  "roots": [
    "<rootDir>/src"
  ],
  "testEnvironment": "node",
  "watchPlugins": [
    [
      "jest-watch-suspend"
    ],
    [
      "jest-watch-toggle-config",
      {
        "setting": "verbose"
      }
    ],
    [
      "jest-watch-toggle-config",
      {
        "setting": "collectCoverage"
      }
    ]
  ]
}
