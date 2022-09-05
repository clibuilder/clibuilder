const config = {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: true
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
  testEnvironment: 'node',
  testMatch: [
    '**/ts/?(*.)+(spec|test|integrate|accept|system|unit).ts'
  ],
  transform: {
    'node_modules/.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    // Need to MANUALLY identify each ESM package, one by one
    'node_modules/(?!(chalk|#ansi-styles)/)'
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

export default config
