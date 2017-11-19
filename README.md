# CLI Builder

[![unstable][unstable-image]][unstable-url]
[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]

`clibuilder` is a CLI building library.

This library supplies two CLI builders: `Cli` and `PluginCli`.

## Cli

`Cli` is a simple, Command Pattern based cli builder.

The benefit of using Command Pattern is that you can develop your CLI command separately from the application itself.

```ts
// bin.ts
import { Cli } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [commandA, commandB]
})
cli.parse(process.argv)

// commands.ts
import { CliCommand } from 'clibuilder'

export const commandA = {
  name: 'echo',
  // `args` is the parsed arguments.
  // `argv` is the raw argv.
  run(args, argv) {
    this.ui.info(argv)
  }
} as CliCommand
```

It comes with a plain presenter.
You can override it to display your cli in any way you want:

```ts
import { Cli, PlainPresenter } from 'clibuilder'

class YourPresenter extends PlainPresenter { ... }

const presenterFactory = {
  createCliPresenter(options) { return new YourPresenter(options) },
  createCommandPresenter(options) { return new YourPresenter(options) }
}

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [...]
}, { presenterFactory })

cli.parse(process.argv)
```

You can specify the shape of the config, which will be loaded automatically using `<cli>.json` convension.

```ts
import { Cli, CliCommand } from 'clibuilder'

const config = { ... }

const cmd = {
  name: 'cmd',
  run() {
    // this.config is typed and accessible
    this.ui.info(this.config)
  }
} CliCommand<typeof config>

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [cmd]
})
```

When working with config, you may want to use the `overrideArgs(args, config)` helper function to get the args overridden by config in proper order:

```ts
import { CliCommand, overrideArgs } from 'clibuilder'

interface Config { ... }

const cmd = {
  name: 'cmd',
  // some options and arguments
  run(args) {
    const overridenConfig = overrideArgs(args, this.config)
  }
} CliCommand<Config>
```

You can add addition information in the context, which will be passed to your commands:

```ts
import { Cli, CliCommand } from 'clibuilder'

const config = { ... }

const cmd = {
  name: 'cmd',
  run() {
    this.ui.info(this.something) // something is a number.
  }
} CliCommand<typeof config, { something: number }>

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [cmd]
}, { something: 10 })
```

## PluginCli

`PluginCli` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

```ts
import { PluginCli } from 'clibuilder'

const cli = new PluginCli({
  name: 'yourapp',
  version: '1.0.0'
})

// in another package
import { Command, CliRegistrar } from 'clibuilder'

export function activate(cli: CliRegistrar) {
  cli.register({
    name: 'plug-x'
    commands: [...]
  })
}

// the other package's package.json
{
  "keywords": ['yourapp-plugin']
}
```

It determines that a package is a plugin by looking at the `keywords` in its `package.json`.

By default it is looking for `${name}-plugin`
You can override this by supplying your own keyword:

```ts
new PluginCli({ name: 'x', version: '1.0.0', keyword: 'another-keyword'})
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
[travis-image]: https://img.shields.io/travis/unional/clibuilder/master.svg?style=flat
[travis-url]: https://travis-ci.org/unional/clibuilder?branch=master
[coveralls-image]: https://coveralls.io/repos/github/unional/clibuilder/badge.svg
[coveralls-url]: https://coveralls.io/github/unional/clibuilder
[greenkeeper-image]: https://badges.greenkeeper.io/unional/clibuilder.svg
[greenkeeper-url]: https://greenkeeper.io/
