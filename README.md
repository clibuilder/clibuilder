# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub Release][github_release]][github-action-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line builder.

## What's new in v8

Key highlights:

- Support standalone CLI
  - `name` and `version` are now required and not read from `package.json`.
- Plugins are loaded through config
  - This drastically improve startup time, as it does not scan `node_modules` anymore.
  - Also better support other package manager such as `yarn PnP` and `pnpm`.
- `keywords` are now used for plugin lookup.
- Distribute `ESM` along with `CJS`.

## Feature Highlights

- support default commands and sub-commands `my-cli cmd1 cmd2 cmd3`
- configuration file support
- plugin support: write commands in separate packages and reuse by multiple CLI
- type inference and validation for config, arguments, and options\
  using [zod](https://github.com/colinhacks/zod) (exported as `z`)

Learn more in the [`clibuilder` README](./packages/clibuilder/README.md)

[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[github_release]: https://github.com/unional/clibuilder/workflows/release/badge.svg
[github-action-url]: https://github.com/unional/clibuilder/actions
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
