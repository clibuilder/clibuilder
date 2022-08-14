const config = {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: true
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '#(.*)': '$1'
  },
  roots: [
    '<rootDir>/ts'
  ],
  collectCoverageFrom: [
    '<rootDir>/ts/**/*.[jt]s',
    '!<rootDir>/ts/bin.[jt]s',
    '!<rootDir>/ts/test-utils/**',
  ],
  testEnvironment: 'node',
  testMatch: [
    '**/ts/?(*.)+(spec|test|integrate|accept|system|unit).[jt]s?(x)'
  ],
  // transform: {
  //   '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  // },
  transformIgnorePatterns: [
    // Need to MANUALLY identify each ESM package, one by one
    'node_modules/(?!(chalk)/)'
  ], watchPlugins: [
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
