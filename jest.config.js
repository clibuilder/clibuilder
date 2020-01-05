const common = require('@unional/devpkg-node/simple/config/jest.common')
module.exports = Object.assign(common, {
  globals: {
    'ts-jest': {
      babelConfig: true,
      diagnostics: false
    }
  }
})
