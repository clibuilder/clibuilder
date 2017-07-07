# CLI Builder

[![unstable][unstable-image]][unstable-url]
[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

Building CLI based on Command Pattern.

[`clibuilder-testutil`](https://github.com/unional/clibuilder-testutil) contains test utilities to help you test against your application.

## Usage

```ts
// bin.ts
import { Cli } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = new Cli('yourcli', '1.0.0', [commandA, commandB])
cli.parse(process.argv)

// commands.ts
import { CommandSpec } from 'clibuilder'

export const commandA = {
  name: 'echo',
  // `args` is the parsed args.
  // `argv` is the raw argv.
  run(args, argv) {
    this.ui.info(argv)
  }
} as CommandSpec
```

You can override the display mechanism:

```ts
import { Cli, PlainPresenter } from 'clibuilder'

class YourPresenter extends PlainPresenter { ... }

const presenterFactory = {
  createCliPresenter(options) { return new YourPresenter(options) },
  createCommandPresenter(options) { return new YourPresenter(options) }
}

const cli = new Cli('yourcli', '1.0.0', [], { presenterFactory })

cli.parse(process.argv)
```

## Contribute

```sh
# right after fork
npm install

# begin making changes
npm run watch

```


[unstable-image]: http://badges.github.io/stability-badges/dist/unstable.svg
[unstable-url]: http://github.com/badges/stability-badges
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[downloads-url]: https://npmjs.org/package/clibuilder
[travis-image]: https://img.shields.io/travis/unional/clibuilder.svg?style=flat
[travis-url]: https://travis-ci.org/unional/clibuilder
[coveralls-image]: https://coveralls.io/repos/github/unional/clibuilder/badge.svg
[coveralls-url]: https://coveralls.io/github/unional/clibuilder
