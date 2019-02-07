# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

[![Circle CI][circleci-image]][circleci-url]
[![Travis CI][travis-image]][travis-url]
[![Codecov][codecov-image]][codecov-url]
[![Coveralls Status][coveralls-image]][coveralls-url]

[![Greenkeeper][greenkeeper-image]][greenkeeper-url]
[![Semantic Release][semantic-release-image]][semantic-release-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line library.

## Features

- Distributed commands. `CliCommand` can be defined separately from `Cli`, even in different packages. This means the same command can be used in different command lines.
- Nested commands.
- Load config file.
- Provide additional context from `Cli` to `CliCommand`
- Replace UI at `Cli` and `CliCommand` level.
- Plugin architecture using `PluginCli`

## Usage

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

export const commandA: CliCommand = {
  name: 'echo',
  // `args` is the parsed arguments.
  // `argv` is the raw argv.
  run(args, argv) {
    this.ui.info(argv)
  }
}
```

It comes with a plain presenter.
You can override it to display your cli in any way you want:

```ts
import { Cli, PlainPresenter, PresenterOptions } from 'clibuilder'

class YourPresenter extends PlainPresenter { ... }

const presenterFactory = {
  createCliPresenter(options: PresenterOptions) { return new YourPresenter(options) },
  createCommandPresenter(options: PresenterOptions) { return new YourPresenter(options) }
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

const cmd: CliCommand<{ ... }> = {
  name: 'cmd',
  run() {
    // this.config is typed and accessible
    this.ui.info(this.config)
  }
}

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  defualtConfig: { ... }
  commands: [cmd]
})
```

When working with config, you can use the `overrideArgs(args, config)` helper function to get the args overridden by config in proper order:

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

const cmd: CliCommand<typeof config, { something: number }> = {
  name: 'cmd',
  run() {
    this.ui.info(this.something) // something is a number.
  }
}

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  defaultConfig: config
  commands: [cmd]
}, { something: 10 })
```

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
# after fork and clone
npm install

# begin making changes
git checkout -b <branch>
npm run watch

# after making change(s)
git commit -m "<commit message>"
git push

# create PR
```

[circleci-image]: https://circleci.com/gh/unional/clibuilder/tree/master.svg?style=shield
[circleci-url]: https://circleci.com/gh/unional/clibuilder/tree/master
[codecov-image]: https://codecov.io/gh/unional/clibuilder/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/unional/clibuilder
[coveralls-image]: https://coveralls.io/repos/github/unional/clibuilder/badge.svg
[coveralls-url]: https://coveralls.io/github/unional/clibuilder
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[downloads-url]: https://npmjs.org/package/clibuilder
[greenkeeper-image]: https://badges.greenkeeper.io/unional/clibuilder.svg
[greenkeeper-url]: https://greenkeeper.io/
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[semantic-release-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[travis-image]: https://img.shields.io/travis/unional/clibuilder/master.svg?style=flat
[travis-url]: https://travis-ci.org/unional/clibuilder?branch=master
[unstable-image]: https://img.shields.io/badge/stability-unstable-yellow.svg
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
