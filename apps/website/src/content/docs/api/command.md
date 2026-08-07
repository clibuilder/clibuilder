---
title: command()
description: The command shape — name, alias, arguments, options, config, context, commands, and run().
---

```ts
function command(cmd: cli.Command): cli.Command
```

`command()` returns its argument unchanged. Its whole job is type inference: it lets you define a
command as a standalone value and still get `run(args)` typed from the `arguments` and `options` you
declared.

```ts
import { command } from 'clibuilder'

const build = command({
  name: 'build',
  description: 'build the project',
  options: { watch: { description: 'rebuild on change', alias: ['w'] } },
  run(args) {
    this.ui.info(args.watch ? 'watching' : 'building once')
  }
})
```

Commands passed inline to `.command()` or `.default()` are inferred without it — reach for
`command()` when the command lives in its own variable or its own file.

## `cli.Command`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | The command's name on the command line. Required for named commands; omitted for a `.default()` command. |
| `description` | `string` | Shown in the help message. |
| `alias` | `string[]` | Alternate names — `alias: ['rm']` makes `app remove` answer to `app rm`. |
| `arguments` | `Argument[]` | Positional arguments, in order. |
| `options` | `Options` | Named options, keyed by option name. |
| `config` | `z.ZodTypeAny` | The schema this command's [config](/clibuilder/guides/configuration/) must satisfy. Declaring it triggers the config load. |
| `context` | `Record<string, any>` | Arbitrary values handed back on `this.context` — the seam for injecting I/O in [tests](/clibuilder/guides/testing/). |
| `commands` | `Command[]` | Sub-commands. |
| `run` | `function` | What the command does. |

A command must have **either** a `run` or a `commands`. A command with `commands` and no `run` is a
group: invoking it prints its help message.

## Arguments

```ts
type Argument = {
  name: string
  description: string
  type?: z.ZodType<any>
}
```

Positional, matched in declaration order. `type` defaults to string. An array type makes the argument
variadic, consuming the remaining positionals; `z.optional()` makes it optional. Argument values are
coerced to the declared type — see
[Arguments & Options](/clibuilder/guides/arguments-and-options/#arguments).

```ts
arguments: [
  { name: 'src', description: 'source file' },
  { name: 'dest', description: 'destination', type: z.optional(z.string()) }
]
```

## Options

```ts
type Options = Record<string, {
  description: string
  type?: z.ZodType<any>
  default?: z.infer<Type>
  alias?: Array<string | { alias: string; hidden: boolean }>
}>
```

`type` defaults to a flag (`boolean | undefined`). Option values are coerced to the declared type,
and a value that fails is a usage error.

```ts
options: {
  port: { description: 'port to listen on', type: z.number(), default: 3000, alias: ['p'] },
  quiet: { description: 'suppress output', alias: ['q', { alias: 'shh', hidden: true }] }
}
```

A hidden alias works but is left out of the help message.

## `run()`

```ts
run(this: RunContext, args: RunArgs): Promise<any> | any
```

Declare it as a **method**, not an arrow function — `this` is what carries the command's context.

### `this`

| Property | Type | Description |
| --- | --- | --- |
| `this.ui` | [`UI`](/clibuilder/api/ui/) | Output — `info`, `warn`, `error`, `debug`, `showHelp`, `showVersion`. |
| `this.config` | `z.infer<ConfigType>` | The loaded, validated config. `undefined` when the command declared no `config`. |
| `this.cwd` | `string` | The directory the CLI was invoked from. |
| `this.keywords` | `string[]` | The CLI's plugin keywords. |
| `this.context` | `Context` | Whatever the command declared as `context`. |

### `args`

An object holding every declared argument and option by name, plus the
[built-in options](/clibuilder/guides/arguments-and-options/#built-in-options) — `args.help` is
always present.

### Return value

Whatever `run()` returns (or resolves to) becomes the resolved value of
[`parse()`](/clibuilder/api/cli/#parseargv), and the `result` from
[`testCommand()`](/clibuilder/api/test-command/).

## `PluginActivationContext`

The argument a [plugin's](/clibuilder/guides/plugins/) `activate()` receives:

```ts
type PluginActivationContext = {
  addCommand(command: cli.Command): void
}
```

```ts
import { command, type PluginActivationContext } from 'clibuilder'

export function activate({ addCommand }: PluginActivationContext) {
  addCommand(command({ name: 'sing', description: 'sing a song', run() { this.ui.info('🎵') } }))
}
```
