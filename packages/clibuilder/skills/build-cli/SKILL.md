---
name: build-cli
description: Builds command-line tools with the clibuilder library (v12), covering cli() and command() setup, typed arguments and options with t, subcommands, returned results, CliError failures and exit codes, config, plugins, and in-process tests with clibuilder/testing. Use when building a CLI with clibuilder, adding a command, option or argument, returning a structured result or error, writing a clibuilder plugin, or testing a clibuilder command. Not for other CLI libraries such as commander, yargs or oclif.
---

# Build a CLI with clibuilder

Requires Node.js 20.19 or newer. clibuilder 12 is ESM only.

```sh
npm install clibuilder
```

## Minimal CLI

`name` and `version` are required. `.parse()` exists once the CLI has a `.default()` or `.command()`.

```ts
#!/usr/bin/env node
import { cli } from 'clibuilder'

cli({ name: 'greet', version: '1.0.0' })
  .default({
    arguments: [{ name: 'name', description: 'who to greet' }],
    options: { loud: { description: 'shout it', alias: ['l'] } },
    run(args) {
      const message = `hello, ${args.name}`
      return args.loud ? message.toUpperCase() : message
    }
  })
  .parse(process.argv)
```

Declare `run` as a method, not an arrow function: `this` carries `this.ui`, `this.config`, `this.cwd`, `this.context` and `this.format`. Write a `description` on every command, argument and option: help is generated from them. Every CLI answers `--help`, `--version`, `--verbose`, `--silent` and `--format toon|json|text`.

## Arguments and options

Import `t` for typed values. `run(args)` gets the exact inferred types.

```ts
import { command, t } from 'clibuilder'

export const serve = command({
  name: 'serve',
  description: 'start the server',
  arguments: [{ name: 'root', description: 'root folder', type: t.string() }],
  options: {
    port: { description: 'port', type: t.int({ min: 1, max: 65535 }), default: 8080, alias: ['p'] },
    tag: { description: 'tags', type: t.array(t.string()).optional() }
  },
  run(args) {
    // args.root: string, args.port: number, args.tag: string[] | undefined
  }
})
```

- Untyped arguments are strings. Untyped options are optional boolean flags.
- Builders: `t.string`, `t.number`, `t.int`, `t.boolean`, `t.literal`, `t.enum`, `t.array`, `t.custom`, `t.json`. Chain `.optional()` or `.check(fn)`.
- An option with no `.optional()` and no `default` is required.
- Constraints go in the builder options (`t.int({ min: 1 })`), not in chained methods.
- Boolean options take `--flag=false`. Array options repeat: `--tag a --tag b`. An array argument is variadic.
- Wrap a standalone command in `command()` so `args` stays typed.

## Subcommands

```ts
cli({ name: 'app', version: '1.0.0' })
  .command(serve)
  .command({
    name: 'repo',
    description: 'manage repositories',
    commands: [command({ name: 'create', description: 'create one', run() {} })]
  })
  .parse(process.argv)
```

A command needs `run` or `commands`. A group without `run` is a usage error when invoked bare.

## Results

The returned value is the answer. By default (`output: 'axi'`) it prints once on stdout in the caller's `--format`, and `this.ui.info/warn/error/debug` write diagnostics to stderr. Shape that output for agents with the `axi` skill. Return plain objects, arrays or strings, or use helpers:

```ts
import { document, empty, result } from 'clibuilder'

return result({ items }, { help: 'Run `app show <id>` for one' })
return empty('0 open tasks found', { help: 'Run `app add` to add one' })
return document(markdown) // verbatim, not encoded
return result({ exists }, { exitCode: 1 }) // answer plus non-zero exit
```

`result()` and `document()` accept `exitCode` from 0 to 255. `empty()` always succeeds.

## Failing

Exit codes: `0` success, `1` could not complete, `2` called incorrectly. Import `exitCodes` for the names. Parsing problems (unknown option, missing argument, bad value) exit `2` on their own. To fail from `run()`, throw `CliError`:

```ts
import { CliError, exitCodes } from 'clibuilder'

throw new CliError({
  message: `no plugin named ${name}`,
  code: 'not-found',        // stable kebab-case: says which failure
  details: { name },        // scalars, scalar lists, or lists of scalar records
  help: 'run `app list` to see them', // string or string[]
  exitCode: 4               // 1 to 255, default 1
})
```

Give every failure a stable `code`. Any other thrown error is treated as a bug and propagates out of `parse()`.

## Config

Config is opt-in. Add the extension before the commands, and declare a Standard Schema (zod, valibot, arktype from your own dependencies) per command:

```ts
import { z } from 'zod'
import { config } from 'clibuilder/config'

cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .command({ name: 'build', description: 'build', config: z.object({ out: z.string() }), run() { return this.config } })
```

It finds `app.json`, `.apprc`, `app.yaml` and similar upward from the working directory, or an `app` key in `package.json`.

## Plugins

Install `@clibuilder/plugins` and add `.use(config()).use(plugins({ keywords: ['app-plugin'] }))`. Users list plugin packages in the config file's `plugins` array. A plugin package exports `activate({ addCommand })`, which calls `addCommand(command({ ... }))`. Add `config()` before `plugins()`.

## Testing

Run a command in-process. No process is spawned and no config file is read.

```ts
import { testCommand } from 'clibuilder/testing'

const { result, messages, exitCode } = await testCommand(serve, 'serve ./public --port 9000')
expect(exitCode).toBeUndefined()
```

- `argv` is the command line after the CLI name. Address nested commands by full path: `'repo create x'`.
- `messages` is stdout and stderr together, in order. `exitCode` is `undefined` unless the command failed.
- Failures do not reject. Assert `exitCode` and `messages`, for example `2` and `code: unknown-option`.
- Pass `{ config: {...} }` to stand in for the config file. Inject fakes through the command's `context` field, read as `this.context`.

## Further reading

- First CLI: https://clibuilder.github.io/clibuilder/getting-started/first-cli/
- Arguments and options: https://clibuilder.github.io/clibuilder/guides/arguments-and-options/
- Failing: https://clibuilder.github.io/clibuilder/guides/failing/
- Plugins: https://clibuilder.github.io/clibuilder/guides/plugins/
- Testing: https://clibuilder.github.io/clibuilder/guides/testing/
- API reference: https://clibuilder.github.io/clibuilder/api/cli/
