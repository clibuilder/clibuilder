---
name: build-cli
description: Build, extend or test a command-line tool with the clibuilder library (v12) — set up cli() and command(), add subcommands and typed arguments or options with t, return results, fail with CliError and exit codes, read a config file, load plugins, and test commands in-process with clibuilder/testing. For requests like "build a CLI with clibuilder", "add a --port option to my clibuilder command", "make this command exit 1 with an error code", or "write a test for this clibuilder command".
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

Declare `run` as a method, not an arrow function: `this` carries `this.ui`, `this.config`, `this.cwd`, `this.context` and `this.format`. Give every command, argument and option a `description`: help is generated from them. Every CLI answers `--help`, `--version`, `--verbose`, `--silent` and `--format toon|json|text`; do not declare a `format` option of your own.

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

A command needs `run` or `commands`. A group without `run` is a `missing-command` usage error when invoked bare.

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

Exit codes: `0` success, `1` could not complete, `2` called incorrectly. Import `exitCodes` for the names. Usage errors (unknown option, missing argument, bad value, a bare group) exit `2` on their own. To fail from `run()`, throw `CliError`:

```ts
import { CliError } from 'clibuilder'

throw new CliError({
  message: `no plugin named ${name}`,
  code: 'not-found',        // stable kebab-case: says which failure
  details: { name },        // scalars, scalar lists, or lists of scalar records
  help: 'run `app list` to see them', // string or string[]
  exitCode: 4               // 1 to 255, default 1
})
```

Give every failure a stable `code`. Any other thrown error is treated as a bug and propagates out of `parse()`.

## Config and plugins

Config is opt-in through `.use(config())` from `clibuilder/config`; plugins need `@clibuilder/plugins`. When a command reads a config file or the CLI loads plugins, read [references/config-and-plugins.md](references/config-and-plugins.md) first.

## Testing

Run a command in-process. No process is spawned and no config file is read.

```ts
import { testCommand } from 'clibuilder/testing'

const { result, messages, exitCode } = await testCommand(serve, 'serve ./public --port 9000')
expect(exitCode).toBeUndefined()
```

- `argv` is the command line after the CLI name. Address nested commands by full path: `'repo create x'`.
- `messages` is stdout and stderr together, in order, including the printed answer. `exitCode` is `undefined` unless the command failed.
- Failures do not reject. Assert `exitCode` and `messages`, for example `2` and `code: unknown-option`.
- Pass `{ config: {...} }` to stand in for the config file. Inject fakes through the command's `context` field, read as `this.context`.

Docs: https://clibuilder.github.io/clibuilder/ (guides and API reference).

## Done when

Before reporting done, check each of these against the result. Report any that fails.

- **C1.** The entry file calls `cli()` with `name` and `version`, and calls `.parse(process.argv)` after a `.default()` or `.command()`.
- **C2.** Every `run` is a method, not an arrow function.
- **C3.** Every typed argument or option uses a `t` builder, with constraints in the builder options.
- **C4.** Every failure in `run()` throws `CliError` with a kebab-case `code`; no `run()` calls `process.exit`.
- **C5.** Each command written or changed has a test that runs it with `testCommand` from `clibuilder/testing` and asserts `exitCode`.
- **C6.** Every clibuilder import names an export of `clibuilder`, `clibuilder/axi`, `clibuilder/config`, `clibuilder/testing` or `@clibuilder/plugins`.
