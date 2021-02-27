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

- single `cli()` for both simple cli and plugin cli
- config, argument, and option type inference now both basic type and array
- using `zod` to define type definition and validation
- each command can have their own config specification
- removed `context` as no use case for it
- support combining short options `-abc 100 => -a -b -c 100`

## Features

- plugin support: write commands in separate packages and reuse by multiple cli
- configuration file support
- type inference for config, arguments, and options
- nested commands - `my-cli cmd1 cmd2 cmd3`
- type validation for config, arguments, and options using [zod](https://github.com/colinhacks/zod)

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

Here are all the different things you can do:

- specify different name, version, description

```ts
cli({ name: 'foo', version: '1.2.3', description: 'some fool' })
```

- add command

```ts
cli().command({ name: 'hello', run() { this.ui.info('hello world') }})
```

- specify arguments (type defaults to string if not specified)

```ts
cli().default({
  arguments: [{ name: 'name', description: 'your name' }],
  run(args) { this.ui.info(`hello, ${args.name}`) }
})
```

- specify argument type

```ts
import { cli } from 'clibuilder'
import * as z from 'zod'

cli().command({
  name: 'sum',
  arguments: [{ name: 'values', description: 'values to add', type: z.array(z.number()) }]
  run(args) {
    return args.values.reduce((p, v) => p + v, 0)
  }
})
```

- specify options (type defaults to boolean if not specified)

```ts
cli().default({
  options: {
    'no-progress': { description: 'disable progress bar' },
    run(args) {
      if (args['no-progress']) this.ui.info('disable progress bar')
    }
  }
})
```

- mark argument and/or options as optional

```ts
cli().default({
  arguments: [{ name: 'a', description: '', type: z.optional(z.string()) }],
  options: {
    y: { type: z.optional(z.number()) }
  }
})
```

- load config (load `${cli}.json`, `.${cli}rc.json`, or `.${cli}rc` in that order ) \
  when the command defines the config type using `zod`.

```ts
cli().default({
  config: z.object({ presets: z.string() }),
  run() {
    this.ui.info(`presets: ${this.config.presets}`)
  }
})
```

- override config name

```ts
cli({ configName: 'another-config' })
```

- load plugins (`loadPlugins(keyword?: string)`)

```ts
cli().loadPlugins()
```

- define options alias

```ts
cli().default({
  option: {
    config: { name: 'value', alisa: ['c']}
  }
})
```

When you create a command from a different files or for plugin,
you can use the `command()` function which provides type validation and inference support.

```ts
import { command } from 'clibuilder'

export const echo = command({
  name: 'echo',
  config: z.object({ a: z.string() }),
  run() { this.ui.info(`echoing ${this.config.a}`)}
})
```

## Defining Plugins

`clibuilder` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

`cli().loadPlugins()` will load plugins when available.

To create a plugins,
use the `command()` function to create command,
and `PluginActivationContext` to default your plugin:

```ts
import { command, PluginActivationContext } from 'clibuilder'

// in plugin package
const sing = command({ ... })
const dance = command({ ... })

export function activate({ addCommand }: PluginCli.ActivationContext) {
  addCommand({
    name: 'miku',
    commands: [sing, cmd2]
  })
}

// in plugin package's package.json
{
  "keywords": ['your-app-plugin']
}
```

The cli will determine that a package is a plugin by looking at the `keywords` in its `package.json`.

By default it is looking for `${name}-plugin`
You can override this by supplying your own keyword:

```ts
cli().loadPlugin('another-keyword')
```

## shebang

To make your cli easily executable,
you should add shebang to your script:

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
