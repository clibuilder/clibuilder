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
| `config` | Standard Schema | The schema this command's [config](/clibuilder/guides/configuration/) must satisfy, from your own `zod`, valibot or arktype. Declaring it triggers the config load. |
| `context` | `Record<string, any>` | Arbitrary values handed back on `this.context` — the seam for injecting I/O in [tests](/clibuilder/guides/testing/). |
| `commands` | `Command[]` | Sub-commands. |
| `examples` | `{ command: string; description: string }[]` | **Unreleased.** Example invocations, shown at the end of the command's help. See [Examples](#examples). |
| `onUsageError` | `UsageErrorHandler` | Takes over how usage errors are reported for this command and its sub-commands. See [Reporting usage errors yourself](/clibuilder/guides/failing/#reporting-usage-errors-yourself). |
| `run` | `function` | What the command does. |

A command must have **either** a `run` or a `commands`. A command with `commands` and no `run` is a
group: invoking it prints its help message.

## Examples

:::note[Unreleased]
`examples` is on `main` and ships in `clibuilder` 12. It is not in a published release yet.
:::

`examples` lists invocations a reader can copy. `command` is the whole command line, written as the
user types it, and `description` says what it does:

```ts
const deploy = command({
  name: 'deploy',
  arguments: [{ name: 'target', description: 'where to deploy' }],
  examples: [{ command: 'app deploy prod', description: 'Deploy to production' }],
  run(args) {}
})
```

The help message ends with them, each description above its command line:

```
Examples:
  Deploy to production
    app deploy prod
```

A command without `examples` shows the same help as before. With `cli({ output: 'axi' })`, the
structured help of `--help --format toon` and `json` carries them too (see
[`--help` and `--version` with `output: 'axi'`](/clibuilder/api/cli/#--help-and---version-with-output-axi)).
An [`onUsageError`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) handler reads them
from `context.command.examples`, for example to suggest a correct invocation.

## Arguments

```ts
type Argument = {
  name: string
  description: string
  type?: t.Descriptor // from t; defaults to a string
}
```

Positional, matched in declaration order. `type` defaults to string. An array type makes the argument
variadic, consuming the remaining positionals; `.optional()` makes it optional. Argument values are
converted to the declared [`t`](/clibuilder/api/t/) type, and a missing required one is a usage error. See
[Arguments & Options](/clibuilder/guides/arguments-and-options/#arguments).

```ts
arguments: [
  { name: 'src', description: 'source file' },
  { name: 'dest', description: 'destination', type: t.string().optional() }
]
```

## Options

```ts
type Options = Record<string, {
  description: string
  type?: t.Descriptor // from t; omit for a flag
  default?: Value<Type>
  alias?: Array<string | { alias: string; hidden: boolean }>
  conflicts?: string[] // options this one cannot be used with
}>
```

`type` defaults to an optional flag (`boolean | undefined`). Option values are converted to the
declared [`t`](/clibuilder/api/t/) type, and a value that fails is a usage error. An option without
`.optional()` and without a `default` is required.

```ts
options: {
  port: { description: 'port to listen on', type: t.int({ min: 1, max: 65535 }), default: 3000, alias: ['p'] },
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
| `this.ui` | [`UI`](/clibuilder/api/ui/) | Output — `info`, `warn`, `error`, `debug`, and the deprecated `showHelp`, `showVersion`. |
| `this.config` | the config schema's output type | The loaded, validated config. `undefined` when the command declared no `config`. |
| `this.cwd` | `string` | The directory the CLI was invoked from. |
| `this.context` | `Context` | Whatever the command declared as `context`. |
| `this.format` | `'toon' \| 'json' \| 'text'` | **Unreleased.** The format to answer in: the caller's [`--format`](/clibuilder/api/cli/#the-global---format-option) when the global option is on, else the CLI's `format`, `'toon'` by default. |
| `this.output` | `'console' \| 'axi'` | **Unreleased.** The CLI's [`output`](/clibuilder/api/cli/#streams-and-output) mode, `'console'` by default. |

### `args`

An object holding every declared argument and option by name, plus the
[built-in options](/clibuilder/guides/arguments-and-options/#built-in-options) — `args.help` is
always present.

### Return value

Whatever `run()` returns (or resolves to) becomes the resolved value of
[`parse()`](/clibuilder/api/cli/#parseargv), and the `result` from
[`testCommand()`](/clibuilder/api/test-command/).

**Unreleased:** with `cli({ output: 'axi' })` the returned value is also printed once on stdout, in
`this.format`. `result()`, `document()` and `empty()` control how; `parse()` resolves to the value
they wrap. See [The result channel](/clibuilder/api/cli/#the-result-channel).

## `PluginActivationContext`

The argument a [plugin's](/clibuilder/guides/plugins/) `activate()` receives. Import the type from
[`@clibuilder/plugins`](/clibuilder/packages/plugins/#writing-a-plugin).

:::caution[Unreleased]
In `clibuilder` 12 (unreleased) `this.keywords` is removed, and `PluginActivationContext` is
exported from `clibuilder` only as a deprecated copy that 13 removes. In `clibuilder` 11,
`this.keywords` holds the CLI's plugin keywords.
:::

```ts
type PluginActivationContext = {
  addCommand(command: cli.Command): void
  register<T>(key: ValueKey<T> | CollectionKey<T>, value: T): void
  get<T>(key: ValueKey<T>): T | undefined
  get<T>(key: CollectionKey<T>): readonly Contribution<T>[]
  has(key: RegistryKey<unknown>): boolean
  host: { name: string; version: string }
}
```

```ts
import { command } from 'clibuilder'
import type { PluginActivationContext } from '@clibuilder/plugins'

export function activate({ addCommand }: PluginActivationContext) {
  addCommand(command({ name: 'sing', description: 'sing a song', run() { this.ui.info('🎵') } }))
}
```

`defineKey()` creates a single-value capability key; the first plugin to register one wins. Use
`defineCollectionKey()` for values contributed by multiple plugins. Command `run()` methods receive
the same read-only registry as `this.registry`, which is the preferred place to resolve values.
