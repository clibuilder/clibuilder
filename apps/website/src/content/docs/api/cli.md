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
    onUsageError?: UsageErrorHandler
    streams?: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream }
    output?: 'axi' | 'console'
    format?: 'toon' | 'json' | 'text'
    refs?: 'help' | 'next'
  }
}
```

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required.** The CLI's name — used in the help message, as the default config name, and as the default keyword of [`plugins()`](/clibuilder/packages/plugins/#options). |
| `version` | `string` | **Required.** Printed by `--version`. Since v8 this is not read from `package.json` — see [Publishing](/clibuilder/guides/publishing/). |
| `description` | `string` | A short summary shown at the top of the help message. |
| `onUsageError` | `UsageErrorHandler` | Takes over how usage errors are reported, for every command that declares no handler of its own. See [Reporting usage errors yourself](/clibuilder/guides/failing/#reporting-usage-errors-yourself). |
| `streams` | `{ stdout, stderr }` | The streams the CLI writes to. Defaults to `process.stdout` and `process.stderr`. See [Streams and output](#streams-and-output). |
| `output` | `'axi' \| 'console'` | How the CLI writes its answers, errors and [`ui`](/clibuilder/api/ui/) messages. Defaults to `'axi'`. `'console'` keeps the `clibuilder` 11 output. See [Streams and output](#streams-and-output). |
| `format` | `'toon' \| 'json' \| 'text'` | The CLI's default format, the default of the [global `--format` option](#the-global---format-option). Defaults to `'toon'`. Answers and errors are encoded in the resolved format. Any other value throws when `cli()` is called. |
| `refs` | `'help' \| 'next'` | Where the [`ref()`](#next-steps-as-command-lines-ref) lines in an answer go. Defaults to `'help'`, which keeps the AXI shape. `'next'` encodes them as `next[N]{run,why}`. Any other value throws when `cli()` is called. |

The `config` option of 11 is removed. A CLI loads a [config file](/clibuilder/guides/configuration/) with
`.use(config())` from `clibuilder/config`, which loads the config for the commands only. It does not
load plugins.

:::caution[Changed in 12.0.0]
In `clibuilder` 11, a `keywords` option exists, and declaring `config` or `keywords` loads the
plugins that the config's `plugins` key names and adds the built-in `plugins` command. In
`clibuilder` 12 all of that moved to
[`@clibuilder/plugins`](/clibuilder/packages/plugins/): `keywords` is removed from `cli()` and
becomes an option of `plugins()`, and `this.keywords` is removed. A CLI that wants plugins calls
`.use(plugins())`. See [Roadmap to v12](/clibuilder/roadmap/v12/#plugins-move-to-clibuilderplugins).
:::

## Streams and output

:::note[Since 12.0.0]
`streams` and `output` ship in `clibuilder` 12.0.0. In 11.5.0 there is no `output`
option, and the CLI behaves as `output: 'console'` does.
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
  .default({ run() { return 'hello' } })
  .parse(process.argv)
// text === 'hello\n'
```

`output` picks one of two modes. Both are permanent, and neither is deprecated.

| | `output: 'axi'` (default) | `output: 'console'` |
| --- | --- | --- |
| Value returned from `run()` | stdout, encoded (see [The result channel](#the-result-channel)) | not printed |
| Thrown `CliError` | stdout, encoded once (see [Errors with `output: 'axi'`](/clibuilder/guides/failing/#errors-with-output-axi)) | message and help on stderr |
| Usage error | stdout, the top-ranked one, coded, exit 2 (see [Usage errors with `output: 'axi'`](/clibuilder/guides/failing/#usage-errors-with-output-axi)) | prose and the full help, exit 2 |
| `--help`, `--version` | stdout, as answers (see [below](#--help-and---version-with-output-axi)) | stdout |
| `ui.info`, `ui.debug` | stderr | stdout |
| `ui.warn`, `ui.error` | stderr | stderr |

With `'axi'`, stdout is left for answers, so an agent or a script reading it never gets diagnostics
mixed in. `'console'` writes what `clibuilder` 11.5.0 wrote, byte for byte, except that its help
lists the [global `--format` option](#the-global---format-option). See the
[v12 roadmap](/clibuilder/roadmap/v12/#output-modes-axi-and-console).

In both modes the CLI writes through its built-in UI:

- Each message is one line: the arguments joined by spaces, with objects shown through
  `util.inspect`.
- `error` is red and `warn` is yellow, but only on a terminal. A stream that is not a TTY never gets
  colour. On a terminal, `FORCE_COLOR` decides when it is set (`0` or `false` turns colour off),
  otherwise a non-empty `NO_COLOR` turns colour off.
- It does not add a `clibuilder` prefix to the framework's own messages.

**Since 12.0.0:** the built-in UI is the only one, and `clibuilder` no longer depends on
standard-log. A CLI on `clibuilder` 11.5.0 writes through standard-log instead, which prefixes the
framework's own messages with `clibuilder` and colours their `error` and `warn` text even when
stderr is not a terminal. See
[standard-log is removed](/clibuilder/roadmap/v12/#standard-log-is-removed).

If the reader of `process.stdout` closes early, as in `app | head -1`, the CLI drops the rest of its
output and exits with code 0 instead of crashing on `EPIPE`. This applies whenever stdout is
`process.stdout`. If you pass your own streams, handling their errors is up to you.

## `--help` and `--version` with `output: 'axi'`

With `output: 'axi'`, the default, the CLI owns `--help` and `--version`. Both are answers: they are written on
stdout, even with `--silent`, nothing is written on stderr, and the CLI exits 0.

`--help` follows [`--format`](#the-global---format-option). `--format text` prints the help message,
the same text as with `output: 'console'`. `toon` and `json` print the structured help that the
text is rendered from:

```sh
$ app deploy --help --format json
```

```json
{
  "name": "app deploy",
  "usage": "app deploy <arguments> [options]",
  "description": "Deploy the app",
  "arguments": [{ "name": "target", "required": true, "type": "enum", "values": ["prod", "dev"], "description": "where to deploy" }],
  "options": [{ "name": "port", "aliases": ["p"], "type": "int", "min": 1, "max": 65535, "required": false, "default": 80, "description": "port to listen on" }],
  "examples": [{ "command": "app deploy prod --port 8080", "description": "Deploy to production on port 8080" }],
  "globalOptions": [{ "name": "help", "aliases": ["h"], "type": "boolean", "required": false, "description": "Print help message" }]
}
```

The real output is on one line; it is spread out here to read. `globalOptions` lists all the
built-in options; it is cut to one here.

| Key | Holds |
| --- | --- |
| `name` | The CLI name and the command chain, as the command is invoked |
| `usage` | The usage line of the help message, without `Usage: ` |
| `description`, `aliases` | The command's own |
| `commands` | Each sub-command's `name`, `aliases`, and the first line of its `description` |
| `arguments`, `options` | Each one's `name`, `aliases`, `type`, `required`, `default`, `description` and `conflicts`. A [`t`](/clibuilder/packages/args-minus/) declaration adds `min` and `max`, `pattern`, or the allowed `values`. An array is described by its element, with `array: true` |
| `config` | The config type, as the help message's `Config:` section shows it |
| `examples` | The command's [`examples`](/clibuilder/api/command/#examples) |
| `globalOptions` | The built-in options, listed once. The root help leaves them out of its `options` |

A key with nothing to say is left out. A group lists only the names and one-line descriptions of its
sub-commands.

`--version` prints the version as plain text in every format, alone or after a command, so a script
that reads it keeps working:

```sh
$ app deploy --version --format json
1.0.0
```

A command that calls `this.ui.showHelp()` from `run()` gets the same answer as `--help`, in
`this.format`, and `this.ui.showVersion()` prints the plain version. Both are deprecated. They stay
on `ui` in 12 and are removed in a later major. Return the answer from `run()` instead (see
[UI](/clibuilder/api/ui/#showhelp)).

With `output: 'console'`, `--help`, `--version`, `ui.showHelp()` and `ui.showVersion()` print what
they printed before. Source:
[axi-native section 3.7](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#37-help-is-not-agent-shaped-6397).

## The global `--format` option

Every command accepts `--format <toon|json|text>`, in both output modes. Help lists it once, with
the other global options. There is no `-f` alias, because `-f` is often a command's own `--force`
or `--file`.

Like the other global options, it may come before the command, after it, or between a group and its
sub-command: `app --format json list` and `app list --format json` are the same. It takes only its
value, so the next word still names the command. See
[Where the built-in options go](/clibuilder/guides/arguments-and-options/#where-the-built-in-options-go).

`run()` reads the resolved value as `this.format`: the caller's `--format`, else the CLI's `format`,
`'toon'` by default. The format is the same on a terminal and in a pipe.

```ts
cli({ name: 'app', version: '1.0.0' })
  .command({
    name: 'list',
    run() {
      return { format: this.format }
    }
  })
  .parse(process.argv)
```

```sh
$ app list --format json
{"format":"json"}
```

The same value is the `format` of the [`onUsageError`](/clibuilder/guides/failing/#reporting-usage-errors-yourself)
context, and with `output: 'axi'` a thrown `CliError` is encoded in it.

A value other than `toon`, `json` or `text` is a usage error with exit code `2` and code
`invalid-value`. It names the option, the value you passed and the allowed values. It is reported
in the CLI's default format, never in the bad one:

```sh
$ app list --format yaml
error: "invalid value for option --format: expected one of 'toon', 'json', 'text', received \"yaml\""
code: invalid-value
option: "--format"
value: yaml
help[2]: "Usage: app list","allowed for --format: toon, json, text (received \"yaml\")"
```

With `output: 'console'` it is the prose error on stderr, followed by the help.

An `onUsageError` handler gets the error with `allowed: ['toon', 'json', 'text']`.

### A command's own `format` option

A command that declares its own `format` option fails the CLI when
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
[`@clibuilder/axi`](/clibuilder/packages/axi/#the-global---format-option). The
`plugins list` and `plugins search` commands of `@clibuilder/plugins` read `this.format` and do not conflict. Source:
[axi-native section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#34---format-is-not-first-class-6394).

## The result channel

With `output: 'axi'`, the default, `run()` returns the answer and the CLI prints it: once, on
stdout, in [`this.format`](#the-global---format-option), with nothing on stderr. `parse()` still
resolves to the value, so tests and programmatic callers see no change. With `output: 'console'`,
nothing is printed for a returned value, as in `clibuilder` 11.

```ts
import { cli, document, empty, result } from 'clibuilder'

cli({ name: 'app', version: '1.0.0' })
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

`run()` reads the output mode as `this.output`, `'axi'` by default. Source:
[axi-native section 3.5](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#35-no-result-channel-6395).

### Next steps as command lines: `ref()`

A `help` line can be a `ref()` instead of a string. It names another command by its path and fills its options,
and the CLI renders it as a complete command line. The same command, run as a script through
[`runScript()`](/clibuilder/api/axi/#run-a-command-as-a-script), renders it for that channel instead.

```ts
import { placeholder, ref, result } from 'clibuilder'

run({ gid }) {
  const task = getTask(gid)
  return result(task, {
    help: [
      ref('task get', { gid: task.parent }, 'show the parent task'),
      ref('task update', { gid, name: placeholder('name') }, 'rename it')
    ]
  })
}
```

```sh
$ app task get --gid 12
gid: "12"
help[2]: Run `app task get --gid 7` to show the parent task,Run `app task update --gid 12 --name <name>` to rename it
```

- **`ref(path, options?, why?)`.** `path` is the command path without the CLI name. Options render as `--name value`
  in the order given: `true` as `--name`, `false` and `undefined` left out, an array as a repeated flag. A value the
  shell would split or expand is single-quoted. `why` is a verb phrase, rendered as ``Run `…` to <why>``.
  A ref passes only the options given: it does not copy the current invocation's global options, such as
  `--repo`, and never adds a confirmation flag such as `--ack`.
- **`placeholder(name)`** is a value the agent fills in, rendered unquoted as `<name>`.
- **Checked against the command tree.** A path that names no command, or an option the command and the global
  options do not have, throws when the answer is printed, so the command's own tests catch it. Aliases work in
  the path. Positional arguments are not supported yet.
- **`cli({ refs: 'next' })`** moves the refs of a returned answer out of `help` and encodes them as
  `next[N]{run,why}`, after `help`. Plain strings stay in `help`. `next` is a clibuilder extension, not part of AXI.
- **Errors keep `help`.** A ref in a `CliError` is always a `help` line, so the error keeps the axi-sdk-js shape.
  `CliError.help` reads it as a string without the CLI name.

Source: [next-step-refs RFC](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/next-step-refs.md).

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
    return 'done'
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
  readonly shared: SharedState
  addGlobalOption(name: string, entry: cli.Command.Options.Entry, answer: GlobalOptionAnswer): void
  beforeRun(hook: BeforeRunHook): void
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
| `shared` | `get`, `set` and `has` for values that extensions share with each other, keyed by `defineKey()`. A value can be replaced, and commands do not see it |
| `addGlobalOption(name, entry, answer)` | Adds a global option, listed with the built-in ones. When the caller passes it, `answer` runs instead of the matched command, after the logging flags apply. What it returns is the answer, as for `run()` |
| `beforeRun(hook)` | Adds a hook that runs before `run()`, once the arguments are valid. The hook may set `run.config`, and fails the command by throwing a `CliError` |
| `resolveConfig()` | Resolves to the config that `.use(config())` loaded and where it came from. `source.type` is `'none'` when the CLI has no `.use(config())`, or adds it after the extension that asks |

When extensions run:

- They run once, on the first `parse()` that needs the command tree. Building the CLI does not run them.
- They run in the order `.use()` was called. Each one is awaited before the next starts, so the
  command order is the same on every run. An extension that reads the config, such as `plugins()`,
  comes after `config()`.
- They run before the global options are resolved, so an extension can add a global option. The
  messages they write to `ui` are held until the logging flags apply.
- Their commands come after the CLI's own `.command()` and `.default()` commands.
- A bare `--version` or `-v` is answered before anything loads, so extensions do not run for it.
  See [the version fast path](/clibuilder/guides/arguments-and-options/#built-in-options).
- `--help` waits for them, because it lists their commands.

`.use()` makes `parse()` available, because an extension may supply every command.

If the config lists plugins, no extension reads the config, and the CLI loads none, it warns once
that plugin loading moved to `@clibuilder/plugins`. See
[Roadmap to v12](/clibuilder/roadmap/v12/#plugins-move-to-clibuilderplugins).

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
`.command()`, or after `.use()`. A CLI can get all
of its commands from an extension such as [`plugins()`](/clibuilder/packages/plugins/), so it is
executable from the start.
:::

`parse()` does **not** reject for usage problems. An unknown flag, a missing required argument, a
value that fails its check, or a config that fails validation are reported and the promise resolves
to the exit code. With `output: 'axi'` the report is one coded error on stdout; with
`output: 'console'` it is the error followed by the help message. A thrown `CliError` is reported
the same way. Any other error thrown by your own `run()` rejects.

## Full example

```ts
#!/usr/bin/env node
import { cli, command } from 'clibuilder'
import { config } from 'clibuilder/config'
import { z } from 'zod'

cli({
  name: 'app',
  version: '1.0.0',
  description: 'an example CLI'
})
  .use(config())
  .default({
    config: z.object({ presets: z.string() }),
    run() {
      return { presets: this.config.presets }
    }
  })
  .command(
    command({
      name: 'build',
      description: 'build the project',
      options: { watch: { description: 'rebuild on change', alias: ['w'] } },
      run(args) {
        return args.watch ? 'watching' : 'building once'
      }
    })
  )
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```
