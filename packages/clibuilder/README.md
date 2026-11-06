# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub Release][github_release]][github-action-url]
[![Codecov][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]

[![Documentation][docs-image]][docs-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line application builder.

📖 **[Read the documentation](https://clibuilder.github.io/clibuilder/)**

## Install

```sh
npm install clibuilder
pnpm add clibuilder
yarn add clibuilder
```

`clibuilder` needs Node.js 20.19 or newer.

## Usage

```ts
import { cli, t } from 'clibuilder'

cli({ name: 'greet', version: '1.0.0' })
  .default({
    description: 'say hello',
    arguments: [{ name: 'name', description: 'who to greet' }],
    options: {
      loud: { description: 'shout it', alias: ['l'] },
      times: { description: 'how many times', type: t.int({ min: 1 }), default: 1 }
    },
    run(args) {
      // args.name: string, args.loud: boolean | undefined, args.times: number
      const line = `hello, ${args.name}`
      return Array(args.times).fill(args.loud ? line.toUpperCase() : line).join('\n')
    }
  })
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

```sh
$ greet world --times 2 -l
HELLO, WORLD
HELLO, WORLD
```

Walk through it in [Your First CLI](https://clibuilder.github.io/clibuilder/getting-started/first-cli/).

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

The [documentation](https://clibuilder.github.io/clibuilder/) has the guides, and the [API reference](https://clibuilder.github.io/clibuilder/api/) covers every export.

[docs-image]: https://img.shields.io/badge/docs-clibuilder.github.io-blue.svg?style=flat
[docs-url]: https://clibuilder.github.io/clibuilder/
[codacy-image]: https://api.codacy.com/project/badge/Grade/07959fd66e08490cbbd7da836f229053
[codacy-url]: https://app.codacy.com/gh/clibuilder/clibuilder/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade
[codecov-image]: https://codecov.io/gh/clibuilder/clibuilder/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/clibuilder/clibuilder
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[github_release]: https://github.com/clibuilder/clibuilder/actions/workflows/release.yml/badge.svg
[github-action-url]: https://github.com/clibuilder/clibuilder/actions
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
