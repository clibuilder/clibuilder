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

📖 **[Documentation](https://clibuilder.github.io/clibuilder/)**

## What's new in v12 (unreleased)

- Agent-facing output is the default (`cli({ output: 'axi' })`):
  - a value returned from `run()` is printed on stdout, in the format the caller asked for with the global `--format <toon|json|text>`;
  - a thrown `CliError` and a usage error are reported once, coded, on stdout;
  - every `ui.*` message is a diagnostic on stderr.
- `cli({ output: 'console' })` keeps the v11 output. It is permanent, not deprecated.

See the [upgrade guide](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/).

## What's new in v8

Key highlights:

- Support standalone CLI
  - `name` and `version` are now required and not read from `package.json`.
- Plugins are loaded through config (in v12, unreleased, by `@clibuilder/plugins`)
  - This drastically improve startup time, as it does not scan `node_modules` anymore.
  - Also better support other package manager such as `yarn PnP` and `pnpm`.
- `keywords` are now used for plugin lookup (in v12, unreleased, an option of `plugins()`).
- Distribute `ESM` along with `CJS` (in v12, unreleased, `ESM` only; `require()` still works on Node.js 20.19+ through `require(esm)`).

## Feature Highlights

- support default commands and sub-commands `my-cli cmd1 cmd2 cmd3`
- configuration file support
- plugin support: write commands in separate packages and reuse by multiple CLI
- type inference for arguments and options with the `t` descriptors (exported as `t`),
  and config validation with any [Standard Schema](https://standardschema.dev) such as zod or valibot

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
  .command({ name: 'hello', run() { return 'hello world' }})
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
    // using `t` to specify number[]
    { name: 'values', description: 'values to add', type: t.array(t.number()) }
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

You can use `.optional()` to mark argument and/or options as optional

```ts
cli({... }).default({
  arguments: [{ name: 'a', description: '', type: t.string().optional() }],
  options: {
    y: { type: t.number().optional() }
  }
})
```

### Option types with `t`

`t` declares an argument or option type.
Each descriptor converts the raw value, carries its constraints as data that help and usage errors show,
and gives `run()` the exact type.
It comes from [`args-minus`](../args-minus/readme.md), which converts and checks every declaration made with it.

```ts
import { t } from 'clibuilder'
import { z } from 'zod' // your own dependency, used in .check() only

cli({ ... }).command({
  name: 'serve',
  arguments: [{ name: 'root', description: 'root folder', type: t.string() }],
  options: {
    port: { description: 'port', type: t.int({ min: 1, max: 65535 }), default: 8080, alias: ['p'] },
    format: { description: 'format', type: t.enum(['toon', 'text', 'json']).optional() },
    tag: { description: 'tags', type: t.array(t.string()).optional() },
    timeout: { description: 'e.g. 1m30s', type: t.custom(parseDuration).optional() },
    email: { description: 'email', type: t.string().optional().check(z.email()) }
  },
  run(args) {
    // args.port: number, args.format: 'toon' | 'text' | 'json' | undefined, args.tag: string[] | undefined
  }
})
```

Help shows each constraint, e.g. `[-p|--port <int 1..65535>]` and `[--format <toon|text|json>]`.

Every declaration follows `args-minus`:

- an option that is neither `.optional()` nor given a `default` must be passed, and is reported as missing otherwise;
- `t.boolean()` is a flag: it takes no following value, but `--dry=false` is accepted;
- `t.array()` takes one value per occurrence: `--tag a --tag b`;
- `.check()` and `t.custom()` may be async; they run after `--help` and `--version` are answered;
- a value that fails conversion, a constraint or a check is an `invalid-value` usage error
  with the option's `constraint` (and `allowed` values for `t.enum`).
  A converter that throws a plain `Error` reports its message; any other throw is a bug and propagates.

In v12 (unreleased) `t` is the only way to declare a type: `z` and zod are removed.
An argument without a `type` is a string, and an option without a `type` is an optional flag.

If you invoke a command expecting a `config`,
the config will be loaded.
Each command defines their own config, with any [Standard Schema](https://standardschema.dev):
zod 3.24 or later, zod 4, valibot, arktype and others, from your own dependency.
`this.config` is the schema's output.

```ts
import { z } from 'zod'

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
In v12 (unreleased) `js-yaml` is an optional peer dependency:
a cli whose users write a `.yaml` or `.yml` config installs it next to `clibuilder` (`npm install js-yaml`).
Without it, reading a YAML config fails with a `CliError` whose code is `missing-peer-dependency`.
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

Plugin support is moving to [`@clibuilder/plugins`](https://github.com/clibuilder/clibuilder/tree/main/packages/plugins), which a CLI adds with
`.use(plugins())`. Both ways work in v11. In v12 (unreleased) core loads no plugins, and `cli({ keywords })` and `this.keywords` are removed: add
`.use(plugins({ keywords: ['my-cli-plugin'] }))` to the cli. See the [v12 migration](https://clibuilder.github.io/clibuilder/roadmap/v12/#plugins-move-to-clibuilderplugins).

## Defining Plugins

`clibuilder` allows you to build plugins to add commands to your application.
i.e. You can build your application in a distributed fashion.

To create a plugin:

- export a `activate(ctx: PluginActivationContext)` function
- add the keywords in your `package.json` to make it searchable

```ts
import { command } from 'clibuilder'
import type { PluginActivationContext } from '@clibuilder/plugins'

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

The CLI can search for plugins using the keywords it passes to `plugins()`.

## Testing

`testCommand()` can be used to test your command:

```ts
import { command } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'

test('some test', async () => {
  const { result, messages } = await testCommand(command({
    name: 'cmd-a',
    run() {
      this.ui.info('miku')
      return 'x'
    }
  }), 'cmd-a')
  expect(result).toBe('x')
  // what the command said, then the answer it printed
  expect(messages).toBe('miku\nx')
})
```

Pass `{ output: 'console' }` as the fourth argument to test a CLI that sets `output: 'console'`.

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

or in CommonJS:

```js
#!/usr/bin/env node
require('clibuilder/compile-cache').enableCompileCache()

const { cli } = require('clibuilder')
```

Measured on the `test-apps` fixtures with `--version`
(node 24.21, median of 25 warm runs, with and without `NODE_DISABLE_COMPILE_CACHE=1`;
both bins load the same `ESM` build, the CommonJS one through `require(esm)`):

| bin        | without | with |
| ---------- | ------- | ---- |
| `ESM`      | 55ms    | 51ms |
| CommonJS   | 54ms    | 50ms |

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
