# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

[![Github NodeJS][github-nodejs]][github-action-url]
[![Codecov][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]

[![Semantic Release][semantic-release-image]][semantic-release-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line library.

## Version 7

[clibuilder](https://github.com/unional/clibuilder) v7 is released!

It is once again re-written from v6 to improve the usage in a fundamental way.
Here are some of the highlights:

- single `cli()` for both basic cli and plugin cli
- config, argument, and option type inference now work with both basic type and array
- using `zod@next` to define type definition and validation
- each command can have their own config specification
- support combining short options `-abc 100 => -a -b -c 100`

## Features

- plugin support: write commands in separate packages and reuse by multiple cli
- configuration file support
- type inference for config, arguments, and options
- nested commands `my-cli cmd1 cmd2 cmd3`
- type validation for config, arguments, and options \
  using [zod@next](https://github.com/colinhacks/zod) (exported as `z`)

## Install

```sh
yarn add clibuilder
```

## Usage

You can use `clibuilder` to create your command line application in many different ways.
The most basic way looks like this:

```ts
cli()
  .default({ run() { /* ...snip... */ }})
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

The above code will:

- get your application name, version, and description from your `package.json`
- call your default `run()` method when invoked
- handle errors so you won't get a ugly NodeJS stacktrace.

You can specify name, version, and description directly:

```ts
cli({ name: 'foo', version: '1.2.3', description: 'some fool' })
```

You can add additional commands and sub-commands:

```ts
cli()
  .command({ name: 'hello', run() { this.ui.info('hello world') }})
  .command({
    name: 'repo',
    commands:[
      command({ name: 'create', run() { /* ..snip.. */ }})
    ]
  })
```

You can add alias to the command:

```ts
cli()
  .command({
    name: 'search-packages',
    alias: ['sp'],
    /* ..snip.. */
  })
```

You can specify arguments:

```ts
cli().default({
  arguments: [
    // type defaults to string
    { name: 'name', description: 'your name' }
  ],
  run(args) { this.ui.info(`hello, ${args.name}`) }
})

import { cli, z } from 'clibuilder'

cli().command({
  name: 'sum',
  arguments: [
    // using `zod` to specify number[]
    { name: 'values', description: 'values to add', type: z.array(z.number()) }
  ],
  run(args) {
    // inferred as number[]
    return args.values.reduce((p, v) => p + v, 0)
  }
})
```

Of course, you can also specify options:

```ts
cli().default({
  options: {
    // type defaults to boolean
    'no-progress': { description: 'disable progress bar' },
    run(args) {
      if (args['no-progress']) this.ui.info('disable progress bar')
    }
  }
})
```

and you can add option alias too:

```ts
cli().command({
  options: {
    project: {
      alias: ['p']
    }
  }
})
```

You can use `z` to mark argument and/or options as optional

```ts
import { cli, z } from 'clibuilder'

cli().default({
  arguments: [{ name: 'a', description: '', type: z.optional(z.string()) }],
  options: {
    y: { type: z.optional(z.number()) }
  }
})
```

If you invoke a command expecting a `config`,
the config will be loaded.
Each command defines their own config.

```ts
import { cli, z } from 'clibuilder'

cli()
.default({
  config: z.object({ presets: z.string() }),
  run() {
    this.ui.info(`presets: ${this.config.presets}`)
  }
})
```

By default, the config file can be `${cli}.json`, `.${cli}rc.json`, or `.${cli}rc`.
You can override the config name too:

```ts
cli({ configName: 'another-config' })
```

One important feature of `clibuilder` is supporting plugins.
You can load plugins by calling `loadPlugins()`:

```ts
cli().loadPlugins()
```

By default, it uses `${cli}-plugin` as the keyword to identify plugins.
You can change that by:

```ts
cli().loadPlugins('another-keyword')
```

When you create a command from a different files or for plugin,
you can use the `command()` function which provides type validation and inference support.

```ts
import { command, z } from 'clibuilder'

export const echo = command({
  name: 'echo',
  config: z.object({ a: z.string() }),
  run() { this.ui.info(`echo ${this.config.a}`)}
})
```

## Defining Plugins

`clibuilder` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

`cli().loadPlugins()` will load plugins when available.

To create a plugins:

- export an `activate(ctx: PluginActivationContext)` function
- add the plugin keyword in your `package.json`

```ts
import { command, PluginActivationContext } from 'clibuilder'

// in plugin package
const sing = command({ ... })
const dance = command({ ... })

export function activate({ addCommand }: PluginCli.ActivationContext) {
  addCommand({
    name: 'miku',
    commands: [sing, dance]
  })
}

// in plugin's package.json
{
  "keywords": ['your-app-plugin']
}
```

The cli will determine that a package is a plugin by looking at the `keywords` in its `package.json`.

## testing

`testCommand()` can be used to test your command:

```ts
import { command, testCommand } from 'clibuilder'

test('some test', async () => {
  const { result, messages } = testCommand(command({
    name: 'cmd-a',
    run() {
      this.ui.info('miku')
      return 'x'
    }
  }), 'cmd-a')
  expect(result).toBe('x')
  expect(messages).toBe('miku')
})
```

## shebang

To make your cli easily executable,
you can add shebang to your script:

```js
#!/usr/bin/env node

// your code
```

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
