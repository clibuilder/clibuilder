const config = {
  'collectCoverageFrom': [
    '<rootDir>/src/**/*.[jt]s',
    '!<rootDir>/src/bin.[jt]s',
    '!<rootDir>/src/test-utils/**',
  ],
  'roots': [
    '<rootDir>/src',
  ],
  'testEnvironment': 'node',
  'testMatch': [
    '**/src/?(*.)+(spec|test|integrate|accept|system|unit).[jt]s?(x)'
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
