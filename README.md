# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

[![Github NodeJS][github-nodejs]][github-action-url]
[![Codecov][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]

[![Greenkeeper][greenkeeper-image]][greenkeeper-url]
[![Semantic Release][semantic-release-image]][semantic-release-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line library.

## Features

- Distributed commands. `Command` can be defined separately from `Cli`, even in different packages. This means the same command can be used in different command lines.
- Nested commands.
- Load config file.
- Provide additional context from `Cli` to `Command`
- Can use different UI at `Cli` and `Command` level.
- Plugin architecture using `PluginCli`

## Usage

```ts
// bin.ts
import { createCli } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = createCli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [commandA, commandB],
  run() { /* when not matching any command */ },
})
cli.parse(process.argv)

// commands.ts
import { createCommand } from 'clibuilder'

export const commandA = createCommand({
  name: 'echo',
  // `args` is the parsed arguments.
  // `argv` is the raw argv.
  run(args, argv) {
    this.ui.info(argv)
  }
})
```

You can define arguments:

```ts
const commandA = createCommand({
  name: 'command-a',
  arguments: [{
    name: 'arg1',
    required: true,
  }]
})
```

and/or options:

```ts
const commandB = createCommand({
  name: 'command-b',
  options: {
    boolean: {
      validate: { ... }
    },
    string: {
      fileName: { ... }
    },
    number: {
      maxSize: { ... }
    }
  }
})
```

It comes with a plain presenter.
You can override it to display your cli in any way you want:

```ts
const ui = new YourUI()

const cli = createCli({
  name: 'yourapp',
  version: '1.0.0',
  commands: [...],
  context: { ui },
})

cli.parse(process.argv)
```

You can specify the shape of the config, which will be loaded automatically using `<cli>.json` convension.

```ts
const cmd = createCommand({
  name: 'cmd',
  config: { ... },
  run() {
    // this.config is typed and accessible
    this.ui.info(this.config)
  },
})

const cli = createCli({
  name: 'yourapp',
  version: '1.0.0',
  config: { ... },
  commands: [cmd],
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
const cmd = createCommand<never, { something: number }>({
  name: 'cmd',
  run() {
    this.ui.info(this.something) // 10
  }
})

const cli = new Cli({
  name: 'yourapp',
  version: '1.0.0',
  context: { something: 10 },
  commands: [cmd],
})
```

`PluginCli` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

```ts
const cli = createPluginCli({
  name: 'yourapp',
  version: '1.0.0'
})

// in plugin package
import { PluginCli } from 'clibuilder'

const cmd1 = createPluginCommand({ ... })
const cmd2 = createPluginCommand({ ... })

export function activate({ register }: ActivationContext) {
  register({
    name: 'miku'
    commands: [cmd1, cmd2]
  })
}

// in plugin package's package.json
{
  "keywords": ['yourapp-plugin']
}
```

It determines that a package is a plugin by looking at the `keywords` in its `package.json`.

By default it is looking for `${name}-plugin`
You can override this by supplying your own keyword:

```ts
createPluginCli({ name: 'x', version: '1.0.0', keyword: 'another-keyword'})
```

There are also test utilites available for you to develop your command line tool.

- `createCliTest()`: create test for `Cli`
- `createPluginCliTest()`: create test for `PluginCli`
- `generateDisplayedMessage()`: generate easy to check messages from logs in `InMemoryDisplay` (through `ui.display.xxxLogs`).

[codacy-image]: https://api.codacy.com/project/badge/Grade/07959fd66e08490cbbd7da836f229053
[codacy-url]: https://www.codacy.com/manual/homawong/clibuilder?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=unional/clibuilder&amp;utm_campaign=Badge_Grade
[codecov-image]: https://codecov.io/gh/unional/clibuilder/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/unional/clibuilder
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[downloads-url]: https://npmjs.org/package/clibuilder
[github-nodejs]: https://github.com/unional/clibuilder/workflows/nodejs/badge.svg
[github-action-url]: https://github.com/unional/clibuilder/actions
[greenkeeper-image]: https://badges.greenkeeper.io/unional/clibuilder.svg
[greenkeeper-url]: https://greenkeeper.io/
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[semantic-release-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
