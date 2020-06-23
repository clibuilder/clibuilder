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

- Cli and Command separation. You can define command in another file or even package.
  - This means the same command can be used in different command lines.
- Nested commands.
- Configuration file.
- Define and pass additional context from `Cli` to `Command`.
- Build-in overridable ui.
- Plugin architecture using `PluginCli`.
- Exit with specific error code by throwing `CliError`.

## Usage

### createCli

You can create a simple cli without any commands.

```ts
const cli = createCli({
  name: 'your-cli',
  version: '1.0.0',
  description: 'say hello world',
  run() { this.ui.info('hello world') }
})

cli.parse(process.argv)
```

You can create a command based cli.

```ts
import { commandA, commandB } from './commands'

const cli = createCli({
  name: 'your-cli',
  version: '1.0.0',
  commands: [commandA, commandB]
})
```

You can also mix them together.
When you supply a command name,
the command will be executed.
When you supply something else (or nothing if you cli does not take argument),
the cli's `run()` will be execute.

```ts
const cli = createCli({
  name: 'your-cli',
  version: '1.0.0',
  commands: [hello],
  description: 'cli level command',
  arguments: [{ name: 'some-arg' }],
  run() { ... }
})

// runs hello command
// terminal> your-cli hello

// runs cli level command
// terminal> your-cli abc
```

When creating `Command`, you can use the `createCommand()` function.

```ts
createCommand({
  name: 'hello',
  description: 'hello world',
  run() { this.ui.info('hello world') },
})
```

Both `Cli` and `Command` supports the `Argument`, `Options`, and `Alias`.

Argument supports `required` and `multiple`.
The argument supporting `multiple` must be the last argument.

```ts
createCli({
  arguments: [{ name: 'arg-1', required: true }, { name: 'arg-2', multiple: true }],
  ...,
})
```

Options support `boolean`, `string`, `number`.

```ts
createCommand({
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
  },
  ...
})
```

Alias are shorthands of a command.
If there is a command name conflicts with an alias, the command name takes precedent.

```ts
createCommand({
  name: 'my-command',
  alias: ['mc', 'mcmd'],
  ...
})
```

Inside the `Cli` and `Command`'s `run()` method,
you have access to the following:

```ts
createCli({
  arguments: [{ name: 'arg1' }],
  options: { ... },
  run(args) {
    args.arg1 // typed as string
    args.yourBoolOption // typed as boolean
    args.yourStrOption // typed as string
    args.yourNumOption // typed as number

    this.config // if you have config defined, it is typed accordingly
    this.cwd // current working directory. Typically it is the same as process.cwd()
    this.ui.error()
    this.ui.warn()
    this.ui.info()
    this.ui.debug()
    this.ui.prompt()
  }
})
```

Currently, the type inference for argument does not correctly detect `multiple`,
so you have to cast it.

```ts
const cli = createCli({
  name: 'your-cli',
  arguments: [{ name: 'multi', multiple: true }],
  options: { number: { id: { description: 'multiple id' }}},
  run(args) {
    args.multi as unknown as string[] // typed as string
    args.ids as unknown as number[] // typed as number correctly, but your usage may expect number[]
  }
})

await cli.parse(['node', 'your-cli', '--id=1', '--id=2'])
```

You can add addition code to the run context.

```ts
createCli({
  context: { a: 1 },
  run() {
    this.a // 1
  }
})
```

The context will be available to the commands.
So it can be used to inject dependencies to the commands.

```ts
createCli({
  context: { fs },
  commands: [{
    ...,
    run() {
      this.fs.openFileSync(...)
    }
  }]
})
```

Note that `context` should be single leveled,
they are merged using spread.
It is done so to keep object instances working correctly.

i.e. deep organization of dependencies does not work.

```ts
createCli({
  context: { fs }, // ok
  context: {  // does not work
    filesystem: { fs },
    database: { db }
  }
})
```

You can also override the UI using `context`.

```ts
const ui = new YourUI()

createCli({
  context: { ui }
  ...
})
```

When you specify `config`,
it will automatically try to load the config from `<cli>.json`, `<cli>.js` or `<cli>rc`.

```ts
createCli({
  name: 'your-cmd',
  config: { a: 1 }, // this is the default config
  run() {
    // config is loaded from `your-cmd.json`
    this.config.a // 2 from cmd.json
  },
})
```

You can also specify a config name different then your cli name.

```ts
createCli({
  name: 'cli',
  config: { a: 1 },
  configName: 'duh'  // will load from `duh.json` instead.
})
```

When using `Config` and `Context`,
you can specify their type using `createCommand<Config, Context>()`.

But due to TypeScript limitation,
when explicitly specifying the `Config` or `Context` type,
you lost the the ability to infer types from `Argument` and `Options`.

Instead, you can specify the `config` property and `context` property directly.
Note that the value in the `config` property is not being used.
It is only for defining the shape of the config that the command expects.

```ts
createCommand<{ a: number }, { b: string }>({
  arguments: [{ name: 'arg' }],
  run(args) {
    args.otherArgs as unknown as string // typed as never
    this.config.a // number
    this.b // string
  }
})

// perferred
createCommand({
  config: { a: 1 },
  context: { b: 'b' },
  arguments: [{ name: 'arg' }],
  run(args) {
    this.config.a // number
    this.b // = 'b'
  }
})
```

If you want the cli to exit with specific code,
you can use or inherit from `CliError`:

```ts
const cli = createCli({
  name: 'cli',
  run() { throw new CliError('some message', 123)}
})
```

### createPluginCli

`PluginCli` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

```ts
const cli = createPluginCli({
  name: 'yourapp',
  version: '1.0.0'
})

// in plugin package
const cmd1 = createPluginCommand({ ... })
const cmd2 = createPluginCommand({ ... })

export function activate({ addCommand }: PluginCli.ActivationContext) {
  addCommand({
    name: 'miku',
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
