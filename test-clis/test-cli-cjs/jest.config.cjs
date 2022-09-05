const config = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  extensionsToTreatAsEsm: ['.ts'],
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
  transform: {
    // 'node_modules/.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    // Need to MANUALLY identify each ESM package, one by one
    // 'node_modules/(?!(assertron|chalk|#ansi-styles)/)'
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
