const config = {
  'collectCoverageFrom': [
    '<rootDir>/ts/**/*.[jt]s',
    '!<rootDir>/ts/bin.[jt]s',
    '!<rootDir>/ts/test-utils/**',
  ],
  'roots': [
    '<rootDir>/ts',
  ],
  'testEnvironment': 'node',
  'testMatch': [
    '**/ts/?(*.)+(spec|test|integrate|accept|system|unit).[jt]s?(x)'
  ],
  'watchPlugins': [
    'jest-watch-suspend',
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

module.exports = config
