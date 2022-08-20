# CLI Builder Repository

[![GitHub Action][github-action]][github-action-url]
[![Codecov][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]

[![Visual Studio Code][vscode-image]][vscode-url]

Repository to packages building CLI tools.

## [`clibuilder`]

[![NPM version][clibuilder-npm-image]][clibuilder-npm-url]
[![NPM downloads][clibuilder-downloads-image]][clibuilder-downloads-url]

Create CLI with config and plugin supports.
### Install

```sh
# npm
npm install clibuilder

# yarn
yarn add clibuilder

# pnpm
pnpm install clibuilder

# rush
rush add -p clibuilder
```

## [`clitester`]

[![NPM version][clitester-npm-image]][clitester-npm-url]
[![NPM downloads][clitester-downloads-image]][clitester-downloads-url]

Test CLI application output against baselines.

### Install

```sh
# npm
npm install -D clitester

# yarn
yarn add -D clitester

# pnpm
pnpm install -D clitester

# rush
rush add -p clitester --dev
```

## Contribute

Please check out our [Contributing Guide](./CONTRIBUTING.md)

[`clibuilder`]: https://github.com/unional/clibuilder/tree/main/packages/clibuilder
[`clitester`]: https://github.com/unional/clibuilder/tree/main/packages/clitester
[clibuilder-downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[clibuilder-downloads-url]: https://npmjs.org/package/clibuilder
[clibuilder-npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[clibuilder-npm-url]: https://npmjs.org/package/clibuilder
[clitester-downloads-image]: https://img.shields.io/npm/dm/clitester.svg?style=flat
[clitester-downloads-url]: https://npmjs.org/package/clitester
[clitester-npm-image]: https://img.shields.io/npm/v/clitester.svg?style=flat
[clitester-npm-url]: https://npmjs.org/package/clitester
[codacy-image]: https://api.codacy.com/project/badge/Grade/07959fd66e08490cbbd7da836f229053
[codacy-url]: https://www.codacy.com/manual/homawong/clibuilder?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=unional/clibuilder&amp;utm_campaign=Badge_Grade
[codecov-image]: https://codecov.io/gh/unional/clibuilder/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/unional/clibuilder
[github-action-url]: https://github.com/unional/clibuilder/actions
[github-action]: https://github.com/unional/clibuilder/workflows/release/badge.svg
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
