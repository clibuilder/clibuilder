module.exports = {
  'collectCoverageFrom': [
    '<rootDir>/src/**/*.[jt]s',
    '!<rootDir>/src/bin.[jt]s',
  ],
  'reporters': [
    'default',
    'jest-progress-tracker',
    // ['jest-audio-reporter', { volume: 0.3 }],
  ],
  'roots': [
    '<rootDir>/src',
  ],
  'testEnvironment': 'node',
  'testMatch': [
    // 'src/cli/(*.)+(spec|test|integrate|accept|system|unit).[jt]s?(x)',
    '**/src/?(*.)+(spec|test|integrate|accept|system|unit).[jt]s?(x)'
  ],
  'watchPlugins': [
    'jest-watch-suspend',
    'jest-watch-repeat',
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    [
      'jest-watch-toggle-config', { 'setting': 'verbose' },
    ],
    [
      'jest-watch-toggle-config', { 'setting': 'collectCoverage' },
    ],
  ],
}
