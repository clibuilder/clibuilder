module.exports = function (wallaby) {
  return {
    "files": [
      { pattern: 'tsconfig.*', instrument: false },
      { pattern: 'fixtures/**', instrument: false },
      "src/**/*.ts",
      "!src/**/*.spec.ts"
    ],
    "tests": [
      "src/**/*.spec.ts"
    ],
    "env": {
      "type": "node"
    },
    compilers: {
      'src/**/*.ts': wallaby.compilers.typeScript({ module: 'commonjs' }),
    },
    testFramework: 'ava',

    setup: function (w) {
      const path = require('path');
      if (path.patched) return;
      const fs = require('fs');
      const resolve = path.resolve;
      path.resolve = function (cwd, f) {
        if (cwd === w.projectCacheDir && f === 'node_modules') {
          arguments[0] = w.localProjectDir;
        }
        return resolve.apply(this, arguments);
      };
      path.patched = true;
    }
  }
}
