# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub Release][github_release]][github-action-url]
[![Codecov][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line application builder.

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

## Install

```sh
# npm
npm install clibuilder

# yarn
yarn add clibuilder

# pnpm
pnpm install clibuilder

#rush
rush add -p clibuilder
```

## Usage

You can use `clibuilder` to create your command line application in many ways.
The most basic way looks like this:

```ts
// Define your app
const app = cli({ name: 'app', version: '1.0.0' })
  .default({ run() { /* ...snip... */ }})

// Use your app
app.parse(process.argv)
  .catch(e => /* handle error */process.exit(e?.code || 1))
```

You can add additional named commands and sub-commands:

```ts
cli({ ... })
  .command({ name: 'hello', run() { this.ui.info('hello world') }})
  .command({
    name: 'repo',
    commands:[
      command({ name: 'create', run() { /* ..snip.. */ }})
    ]
  })
```

Command can have alias:

```ts
cli({ ... })
  .command({
    name: 'search-packages',
    alias: ['sp'],
    /* ..snip.. */
  })

// call as: `my-cli sp`
```

You can specify arguments:

```ts
cli({ ... }).default({
  arguments: [
    // type defaults to string
    { name: 'name', description: 'your name' }
  ],
  run(args) { this.ui.info(`hello, ${args.name}`) }
})

cli({ ... }).command({
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
cli({ ... }).default({
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
cli({ ... }).command({
  options: {
    project: {
      alias: ['p']
    }
  }
})
```

You can use `z` to mark argument and/or options as optional

```ts
cli({... }).default({
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
cli({ ... })
.default({
  config: z.object({ presets: z.string() }),
  run() {
    this.ui.info(`presets: ${this.config.presets}`)
  }
})
```

## Config

Config file can be written in `JSON`, `YAML`, `cjs`, or `mjs`.
Common filename are supported:

- `.{name}.<cjs|mjs|js|json|yaml|yml>`
- `.{name}rc.<cjs|mjs|js|json|yaml|yml>`
- `{name}.<cjs|mjs|js|json|yaml|yml>`
- `{name}rc.<cjs|mjs|js|json|yaml|yml>`

You can override the config name too:

```ts
cli({ config: 'alt-config.json' })
```

## Plugins

One of the key features of `clibuilder` is supporting plugins.
Plugins are defined inside the config:

```json
{
  "plugins": ["my-cli-plugin"]
}
```

## Defining Plugins

`clibuilder` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

To create a plugin:

- export a `activate(ctx: PluginActivationContext)` function
- add the keywords in your `package.json` to make it searchable

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
  "keywords": ['your-app-plugin', 'vocaloid']
}
```

The CLI can search for plugins using the `keywords` values.

## Testing

`testCommand()` can be used to test your command:

```ts
import { command, testCommand } from 'clibuilder'

test('some test', async () => {
  const { result, messages } = await testCommand(command({
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

## Startup time

Node can cache the compiled bytecode of every module your CLI loads,
so the second and later runs skip compiling them again.
`clibuilder` exposes it as an opt-in helper:

```js
#!/usr/bin/env node
import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

const { cli } = await import('clibuilder')

cli({ name: 'app', version: '1.0.0' })
  .default({ run() { /* ...snip... */ } })
  .parse(process.argv)
```

or in `CJS`:

```js
#!/usr/bin/env node
require('clibuilder/compile-cache').enableCompileCache()

const { cli } = require('clibuilder')
```

Measured on the `test-apps` fixtures (node 24, median of 25 warm runs):

| build | without | with |
| ----- | ------- | ---- |
| `ESM` | 86ms    | 81ms |
| `CJS` | 43ms    | 37ms |

Two rules make it work, and both are easy to get wrong:

- **Call it first.** The cache applies to modules compiled *after* the call,
  so it must run before your CLI and its dependencies are loaded.
  Calling it later — from your command's `run()`, or from inside `cli()` —
  caches nothing.
  That is why `clibuilder` does not turn it on for you:
  by the time `cli()` runs, everything worth caching is already compiled.
- **In `ESM`, use `await import`.** A static `import` compiles the entire module
  graph before any of it runs, so a statically imported `cli` is already
  compiled by the time `enableCompileCache()` executes.
  `clibuilder/compile-cache` is a separate entry point that pulls in nothing but
  `node:module`, so importing it statically costs nothing.

The helper never throws.
On runtimes without the API (node < 22.1, and currently `bun` and `deno`) it
does nothing and reports why:

```js
const { enabled, directory, message } = enableCompileCache()
```

By default node picks the cache location.
Pass a directory to choose your own:

```js
enableCompileCache(path.join(os.homedir(), '.cache/my-cli'))
```

If the user sets the `NODE_COMPILE_CACHE` environment variable,
their directory wins and the argument is ignored.
They can also use that variable to switch the cache on for a CLI that does not
call the helper at all.

## shebang

To make your CLI easily executable,
you can add shebang to your script:

```js
#!/usr/bin/env node

// your code
```

[codacy-image]: https://api.codacy.com/project/badge/Grade/07959fd66e08490cbbd7da836f229053
[codacy-url]: https://app.codacy.com/gh/unional/clibuilder/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade
[codecov-image]: https://codecov.io/gh/unional/clibuilder/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/unional/clibuilder
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[github_release]: https://github.com/unional/clibuilder/workflows/release/badge.svg
[github-action-url]: https://github.com/unional/clibuilder/actions
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
