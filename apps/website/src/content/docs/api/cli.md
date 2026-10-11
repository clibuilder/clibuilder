---
title: cli()
description: Create the CLI builder — options, the builder methods, and parse().
---

```ts
function cli(options: cli.Options): cli.Builder
```

Creates the builder that every `clibuilder` application starts from.

```ts
import { cli } from 'clibuilder'

const app = cli({ name: 'app', version: '1.0.0' })
```

## Options

```ts
namespace cli {
  type Options = {
    name: string
    version: string
    description?: string
    config?: string | boolean
    keywords?: string[]
    onUsageError?: UsageErrorHandler
    streams?: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream }
    output?: 'console' | 'axi'
    format?: 'toon' | 'json' | 'text'
  }
}
```

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required.** The CLI's name — used in the help message, as the default config name, and as the default plugin keyword. |
| `version` | `string` | **Required.** Printed by `--version`. Since v8 this is not read from `package.json` — see [Publishing](/clibuilder/guides/publishing/). |
| `description` | `string` | A short summary shown at the top of the help message. |
| `config` | `string \| boolean` | Opt into a [config file](/clibuilder/guides/configuration/). `true` derives the config name from `name`; a string overrides it. |
| `keywords` | `string[]` | Keywords used by the built-in `plugins list` / `plugins search` commands. Defaults to `[name]` when `config` is set. Planned for removal in v12, where it becomes an option of [`plugins()`](/clibuilder/packages/plugins/#options). |
| `onUsageError` | `UsageErrorHandler` | Takes over how usage errors are reported, for every command that declares no handler of its own. See [Reporting usage errors yourself](/clibuilder/guides/failing/#reporting-usage-errors-yourself). |
| `streams` | `{ stdout, stderr }` | **Unreleased.** The streams the CLI writes to. Defaults to `process.stdout` and `process.stderr`. See [Streams and output](#streams-and-output). |
| `output` | `'console' \| 'axi'` | **Unreleased.** Where [`ui`](/clibuilder/api/ui/) messages and errors go. Defaults to `'console'`. See [Streams and output](#streams-and-output). |
| `format` | `'toon' \| 'json' \| 'text'` | **Unreleased.** The CLI's default format. Defaults to `'toon'`. Setting it, or `output: 'axi'`, turns on the [global `--format` option](#the-global---format-option). With `output: 'axi'`, a thrown [`CliError`](/clibuilder/guides/failing/#errors-with-output-axi) is encoded in the resolved format. Any other value throws when `cli()` is called. |

Declaring `config` or `keywords` also adds the built-in `plugins` command to the CLI, unless the CLI
uses [`@clibuilder/plugins`](/clibuilder/packages/plugins/), which adds its own.

## Streams and output

:::caution[Unreleased]
`streams` and `output` are on `main` for the next `clibuilder` 11 minor, which is not published yet.
:::

`streams` sends everything the CLI writes to the two streams you pass, such as when you embed the
CLI or capture its output:

```ts
import { Writable } from 'node:stream'

let text = ''
const capture = new Writable({
  write(chunk, _encoding, done) {
    text += chunk
    done()
  }
})

await cli({ name: 'app', version: '1.0.0', streams: { stdout: capture, stderr: process.stderr } })
  .default({ run() { this.ui.info('hello') } })
  .parse(process.argv)
// text === 'hello\n'
```

`output` picks where each [`ui`](/clibuilder/api/ui/) message goes:

| Method | `output: 'console'` (default) | `output: 'axi'` |
| --- | --- | --- |
| `ui.info`, `ui.debug` | stdout | stderr |
| `ui.warn`, `ui.error` | stderr | stderr |
| `ui.showHelp`, `ui.showVersion`, `--help`, `--version` | stdout | stdout |

With `'axi'`, stdout is left for answers, so an agent or a script reading it never gets diagnostics
mixed in. With `'axi'`, a `CliError` thrown from `run()` is also an answer: it is rendered once on
stdout in the CLI's `format`, and nothing is written to stderr for it (see
[Errors with `output: 'axi'`](/clibuilder/guides/failing/#errors-with-output-axi)). So is a value
returned from `run()`: it is printed once on stdout (see [The result channel](#the-result-channel)).
So is a usage error: the top-ranked one is one coded error on stdout, with no help (see
[Usage errors with `output: 'axi'`](/clibuilder/guides/failing/#usage-errors-with-output-axi)).
`'axi'` becomes the default in v12. Both modes
are permanent. See the [v12 roadmap](/clibuilder/roadmap/v12/#output-modes-axi-and-console).

When you pass `streams` or set `output: 'axi'`, the CLI uses its built-in UI:

- Each message is one line: the arguments joined by spaces, with objects shown through
  `util.inspect`.
- `error` is red and `warn` is yellow, but only on a terminal. A stream that is not a TTY never gets
  colour. On a terminal, `FORCE_COLOR` decides when it is set (`0` or `false` turns colour off),
  otherwise a non-empty `NO_COLOR` turns colour off.
- It does not add the `clibuilder` prefix that the default UI puts on the framework's own messages.

Without either option, the CLI writes exactly what it wrote before.

If the reader of `process.stdout` closes early, as in `app | head -1`, the CLI drops the rest of its
output and exits with code 0 instead of crashing on `EPIPE`. This applies whenever stdout is
`process.stdout`. If you pass your own streams, handling their errors is up to you.

## The global `--format` option

:::caution[Unreleased]
The global `--format` and `this.format` are on `main` for the next `clibuilder` 11 minor, which is
not published yet.
:::

With `output: 'axi'`, or when `format` is set, every command accepts `--format <toon|json|text>`.
Help lists it once, with the other global options. There is no `-f` alias, because `-f` is often a
command's own `--force` or `--file`. Without `output: 'axi'` and without `format`, there is no
global `--format`, and the CLI behaves as before.

Like the other global options, it may come before the command, after it, or between a group and its
sub-command: `app --format json list` and `app list --format json` are the same. It takes only its
value, so the next word still names the command. See
[Where the built-in options go](/clibuilder/guides/arguments-and-options/#where-the-built-in-options-go).

`run()` reads the resolved value as `this.format`: the caller's `--format`, else the CLI's `format`,
`'toon'` by default. The format is the same on a terminal and in a pipe.

```ts
cli({ name: 'app', version: '1.0.0', output: 'axi' })
  .command({
    name: 'list',
    run() {
      this.ui.info(`answering in ${this.format}`)
    }
  })
  .parse(process.argv)
```

```sh
$ app list --format json
answering in json
```

The same value is the `format` of the [`onUsageError`](/clibuilder/guides/failing/#reporting-usage-errors-yourself)
context, and with `output: 'axi'` a thrown `CliError` is encoded in it.

A value other than `toon`, `json` or `text` is a usage error with exit code `2` and code
`invalid-value`. It names the option, the value you passed and the allowed values. It is reported
in the CLI's default format, never in the bad one:

```sh
$ app list --format yaml
invalid value for option --format: expected one of: toon, json, text, received "yaml"
```

With `output: 'axi'` it is a [coded error on stdout](/clibuilder/guides/failing/#usage-errors-with-output-axi),
with `allowed for --format: toon, json, text (received "yaml")` in its `help`.

An `onUsageError` handler gets the error with `allowed: ['toon', 'json', 'text']`.

### A command's own `format` option

While the global option is on, a command that declares its own `format` option fails the CLI when
the command is added, or when a plugin or an extension adds it. Two options with the same name would
shadow each other. To migrate, delete the local declaration and read `this.format`:

```diff
 command({
   name: 'list',
-  options: { format: formatOption },
-  run(args) {
-    return createOutput(args.format).result({ items })
+  run() {
+    return createOutput(this.format).result({ items })
   }
 })
```

This includes `formatOption` and `defineFormatOption()` from
[`@clibuilder/axi`](/clibuilder/packages/axi/#the-global---format-option). The built-in
`plugins list` and `plugins search` read `this.format` and do not conflict. Source:
[axi-native section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#34---format-is-not-first-class-6394).

## The result channel

:::caution[Unreleased]
The result channel, `result()`, `document()`, `empty()` and `this.output` are on `main` for the next
`clibuilder` 11 minor, which is not published yet.
:::

With `output: 'axi'`, `run()` returns the answer and the CLI prints it: once, on stdout, in
[`this.format`](#the-global---format-option), with nothing on stderr. `parse()` still resolves to the
value, so tests and programmatic callers see no change. With the default `output: 'console'`, nothing
is printed for a returned value, as before.

```ts
import { cli, document, empty, result } from 'clibuilder'

cli({ name: 'app', version: '1.0.0', output: 'axi' })
  .command({
    name: 'list',
    run() {
      if (items.length === 0) return empty('0 open tasks found', { help: 'Run `app add` to add one' })
      return result({ items }, { help: 'Run `app show <id>` for one' })
    }
  })
  .parse(process.argv)
```

```sh
$ app list
items[2]: a,b
help[1]: Run `app show <id>` for one

$ app list --format json
{"items":["a","b"],"help":["Run `app show <id>` for one"]}
```

How each return is printed:

| `run()` returns | Printed |
| --- | --- |
| `undefined`, or nothing | nothing |
| an object | encoded in the format: `toon`, one line of `json`, or `text` |
| an array or a scalar | encoded under the `result` key, such as `result[2]: a,b` or `{"result":3}` |
| a string | the string, verbatim |
| `result(value, { help, render })` | the value, with `help` as the last key |
| `document(content)` | the content, verbatim, whatever the format |
| `empty(message, { help })` | `empty: <message>`, then `help`. Exit code 0 |

Every answer ends on one newline.

- **`result(value, { help, render })`** adds next steps and controls the printed form. `help` is a
  string or a list, encoded as a `help[N]` list inside the output, and left out when empty. `render`
  maps a format to a function that returns a string: for that format the string is written verbatim,
  then the `help`, encoded in the same format, after a blank line. A format without a renderer uses
  the encoder. For example, `{ render: { text: (v) => table(v.items) } }`.
- **`document(content)`** is for output that is already the answer, such as Markdown, a diff or a
  file. Run through an encoder, it would come back as one escaped line.
- **`empty(message, { help })`** says that there is nothing to report, so an agent does not retry to
  make sure. It is a success.

`parse()` resolves to the value `result()` wraps, the content of `document()` and the message of
`empty()`, in either output. A warning the reader must see belongs in the returned data:
`ui.warn` is a diagnostic on stderr.

`run()` reads the output mode as `this.output`, `'console'` by default. Source:
[axi-native section 3.5](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#35-no-result-channel-6395).

## `Builder`

```ts
type Builder = {
  readonly name: string
  readonly version: string
  readonly description: string
  default(command): Omit<this, 'default'> & Executable
  command(command): this & Executable
  use(extension): this & Executable
}
```

### `.default(command)`

Defines the command that runs when no sub-command is named. Takes a
[command](/clibuilder/api/command/) **without** a `name` — the CLI's name is its name.

```ts
cli({ name: 'app', version: '1.0.0' }).default({
  description: 'do the thing',
  run() {
    this.ui.info('running')
  }
})
```

Can be called once: `default` is removed from the returned type afterwards.

### `.command(command)`

Adds a named command. Returns the builder, so calls chain.

```ts
cli({ name: 'app', version: '1.0.0' })
  .command({ name: 'a', description: 'command a', run() {} })
  .command({ name: 'b', description: 'command b', run() {} })
```

See [`command()`](/clibuilder/api/command/) for the full shape.

### `.use(extension)`

`.use()` is available from `clibuilder` 11.5.0.

Adds an extension: a function that adds commands and registry entries before `parse()` picks the
command to run. [`@clibuilder/plugins`](/clibuilder/packages/plugins/) is one.

```ts
import type { Extension } from 'clibuilder'

const hello: Extension = ({ addCommand }) => {
  addCommand({ name: 'hello', run: () => 'world' })
}

cli({ name: 'app', version: '1.0.0' }).use(hello).parse(process.argv)
```

```ts
type Extension = (context: ExtensionContext) => void | Promise<void>

type ExtensionContext = {
  readonly host: { readonly name: string; readonly version: string }
  readonly cwd: string
  readonly ui: UI
  readonly registry: RegistryOwner
  addCommand(command: cli.Command): void
  resolveConfig(): Promise<ConfigLoadResult>
}
```

| Field | Description |
| --- | --- |
| `host` | The CLI's `name` and `version` |
| `cwd` | The working directory the CLI runs in |
| `ui` | The CLI's own [UI](/clibuilder/api/ui/), so messages follow `--silent`, `--verbose` and `--debug-cli` |
| `registry` | The registry that commands read as `this.registry`. `register(source, key, value)` adds a value under a `defineKey()` or `defineCollectionKey()` key |
| `addCommand(command)` | Adds a top-level command |
| `resolveConfig()` | Resolves to the CLI's config and where it came from. `source.type` is `'none'` when the CLI sets no `config` |

When extensions run:

- They run once, on the first `parse()` that needs the command tree. Building the CLI does not run them.
- They run in the order `.use()` was called. Each one is awaited before the next starts, so the
  command order is the same on every run.
- Their commands come after the CLI's own `.command()` and `.default()` commands.
- A bare `--version` or `-v` is answered before anything loads, so extensions do not run for it.
  See [the version fast path](/clibuilder/guides/arguments-and-options/#built-in-options).
- `--help` waits for them, because it lists their commands.

`.use()` makes `parse()` available, because an extension may supply every command.

## `Executable`

```ts
type Executable = {
  parse<R = any>(argv: string[]): Promise<R>
}
```

### `.parse(argv)`

Parses the command line, resolves the command, validates its arguments, options, and config, and
calls its `run()`. Resolves to whatever `run()` returned.

```ts
app.parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

`argv` is a full `process.argv` — the first two entries (the node binary and the script path) are
skipped.

:::note[When `parse()` exists]
`parse` appears on the type only after the builder has something to run: after `.default()`, after
`.command()`, or immediately if the CLI was created with `config`. A config-driven CLI can get all
of its commands from plugins, so it is executable from the start.
:::

`parse()` does **not** reject for usage problems. An unknown flag, a missing required argument, a
value that fails its schema, or a config that fails validation all cause the help message to be
printed and the promise to resolve. Only an error thrown by your own `run()` rejects.

## Full example

```ts
#!/usr/bin/env node
import { cli, command, z } from 'clibuilder'

cli({
  name: 'app',
  version: '1.0.0',
  description: 'an example CLI',
  config: true,
  keywords: ['app-plugin']
})
  .default({
    config: z.object({ presets: z.string() }),
    run() {
      this.ui.info(`presets: ${this.config.presets}`)
    }
  })
  .command(
    command({
      name: 'build',
      description: 'build the project',
      options: { watch: { description: 'rebuild on change', alias: ['w'] } },
      run(args) {
        this.ui.info(args.watch ? 'watching' : 'building once')
      }
    })
  )
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```
