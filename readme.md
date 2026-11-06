# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub Release][github_release]][github-action-url]

[![Documentation][docs-image]][docs-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line application builder.

## Features

- [Commands](https://clibuilder.github.io/clibuilder/guides/commands/): a default command, named commands and sub-commands to any depth, with aliases.
- [Arguments and options](https://clibuilder.github.io/clibuilder/guides/arguments-and-options/): typed with the [`t`](https://clibuilder.github.io/clibuilder/api/t/) descriptors, inferred into `run(args)`, and checked before `run()` is called.
- [AXI-native output](https://clibuilder.github.io/clibuilder/getting-started/axi/): the value `run()` returns is the answer, in `toon`, `json` or `text`.
- [Configuration](https://clibuilder.github.io/clibuilder/guides/configuration/): a config file loaded by `clibuilder/config` and validated per command with any Standard Schema.
- [Plugins](https://clibuilder.github.io/clibuilder/guides/plugins/): commands published as separate packages, loaded by `@clibuilder/plugins`.
- [Failing](https://clibuilder.github.io/clibuilder/guides/failing/): coded errors with `CliError`, and ranked usage errors.
- [Testing](https://clibuilder.github.io/clibuilder/guides/testing/): `testCommand()` runs a command in-process.
- [Compile cache](https://clibuilder.github.io/clibuilder/api/compile-cache/): an opt-in helper that speeds up the second and later runs.

## What's new in v12

Agent-facing output is the default: a value returned from `run()` is printed on stdout, and every `ui.*` message is a diagnostic on stderr.
`cli({ output: 'console' })` keeps the v11 output. `t` replaces zod.
See [Upgrading to 12](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/).

## Documentation

📖 The [documentation](https://clibuilder.github.io/clibuilder/) has the guides, and the [API reference](https://clibuilder.github.io/clibuilder/api/) covers every export.

The site lives in [`apps/website`](https://github.com/clibuilder/clibuilder/tree/main/apps/website). To work on it:

```sh
pnpm web dev      # local dev server
pnpm web build    # production build into apps/website/dist
```

Learn more in the [`clibuilder` README](https://github.com/clibuilder/clibuilder/blob/main/packages/clibuilder/README.md)

[docs-image]: https://img.shields.io/badge/docs-clibuilder.github.io-blue.svg?style=flat
[docs-url]: https://clibuilder.github.io/clibuilder/
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[github_release]: https://github.com/clibuilder/clibuilder/actions/workflows/release.yml/badge.svg
[github-action-url]: https://github.com/clibuilder/clibuilder/actions
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
