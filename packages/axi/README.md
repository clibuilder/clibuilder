# @clibuilder/axi

[![NPM version][npm-image]][npm-url]

Agent-facing output conventions (AXI) for [`clibuilder`][clibuilder] CLIs.

`clibuilder` already owns half of an agent-facing CLI's contract: its exit codes.
This package holds the other half — everything the agent reads on stdout, in the
format the caller asked for: the result, the next steps, an error it can act on,
and an answer that says how much it left out.

The formats:

- `toon` (default) — [TOON][toon], the cheapest read for an agent.
- `json` — compact JSON, for a pipe into `jq`.
- `text` — an aligned, human-readable report.

## Install

```sh
npm install @clibuilder/axi clibuilder
```

`clibuilder` `>= 11.2` is a peer dependency. Node.js `>= 20.19`.

## Usage

Spread `formatOption` into a command's options, and write the result through
`createOutput`:

```ts
import { createOutput, formatOption } from '@clibuilder/axi'
import { command } from 'clibuilder'
import { findPlugins } from './plugins.js' // your own logic

export const listCommand = command({
	name: 'list',
	description: 'List the installed plugins',
	options: { format: formatOption },
	async run(args) {
		const plugins = await findPlugins(this.cwd)
		return createOutput(args.format).result({ plugins })
	}
})
```

```sh
$ my-cli list
plugins[2]: plugin-a,plugin-b

$ my-cli list --format json
{"plugins":["plugin-a","plugin-b"]}

$ my-cli list --format text
plugins:
  - plugin-a
  - plugin-b

$ my-cli list --format yaml   # a usage error, exit code 2
```

`args.format` is typed `'toon' | 'json' | 'text' | undefined`, and an unknown
value is rejected by `clibuilder` before `run` is called.

`result()` returns the value it wrote, so a test can assert on the command's
return value. Pass a writer to capture the output instead of writing to stdout:

```ts
const output = createOutput(args.format, { stdout: { write: (chunk) => chunks.push(chunk) } })
```

### Documents

A Markdown body an agent is about to follow is the answer, not a value to
encode. Write it verbatim:

```ts
const output = createOutput(args.format)
output.document(markdown)
```

Or render it only for `text`, keeping TOON and JSON for the metadata:

```ts
import { createOutput, defineFormatOption } from '@clibuilder/axi'

command({
	name: 'show',
	description: 'Show a reference',
	options: { format: defineFormatOption({ default: 'text' }) },
	run(args) {
		const entry = { name: 'rules', path: 'rules.md', content: '# Rules\n' }
		return createOutput(args.format).result(entry, { text: (e) => e.content })
	}
})
```

### Next steps

Tell the agent what it can usefully run next. The suggestions follow the result
under `help`, and are left out when there are none — a self-contained answer
carries no hint:

```ts
output.result({ plugins }, { help: 'Run `my-cli show <name>` to see a plugin' })
```

```sh
$ my-cli list
plugins[2]: plugin-a,plugin-b
help[1]: Run `my-cli show <name>` to see a plugin
```

### Errors

An error is an answer too, so it goes to stdout in the caller's format: what
went wrong, a stable `code` to branch on, and the command that fixes it.
`output.error()` writes it and returns a `CliError` to throw, carrying the exit
code (1 by default, `exitCodes.usage` when the call itself was wrong):

```ts
const output = createOutput(args.format)
const plugin = plugins.find((p) => p.name === args.name)
if (!plugin) {
	throw output.error({
		message: `no plugin named ${args.name}`,
		code: 'not-found',
		help: 'Run `my-cli list` to see the installed plugins'
	})
}
```

```sh
$ my-cli show foo
error: no plugin named foo
code: not-found
help[1]: Run `my-cli list` to see the installed plugins
```

`clibuilder` also logs the message on stderr, as a diagnostic.

Usage errors — an unknown option, a missing argument — get the same shape and
exit code 2 when the CLI uses `createUsageErrorHandler()`:

```ts
import { createUsageErrorHandler } from '@clibuilder/axi'
import { cli } from 'clibuilder'

cli({ name: 'my-cli', version: '1.0.0', onUsageError: createUsageErrorHandler() })
```

```sh
$ my-cli list --stat open
error: unknown option --stat
code: unknown-option
help[1]: "valid options for `list`: --format, --state (--help always allowed)"
```

The handler runs before `--format` is parsed, so it writes TOON unless built
with another format.

### Truncation, counts, and empty states

Cut what is long, say how much there was, and offer `--full`:

```ts
import { createOutput, formatOption, fullOption, orEmpty, truncateList, truncateText } from '@clibuilder/axi'

command({
	name: 'list',
	options: { format: formatOption, full: fullOption },
	run(args) {
		const full = args.full || args.format === 'json' // JSON goes to pipes: never truncate it
		const { items, count, truncated } = truncateList(tasks, { limit: 30, full })
		return createOutput(args.format).result(
			{ count, tasks: orEmpty(items, '0 open tasks found in this repository') },
			{ help: truncated ? 'Run `my-cli list --full` to see every task' : undefined }
		)
	}
})
```

```sh
$ my-cli list
count: 30 of 847 total
tasks[30]{id,title,state}:
  ...
help[1]: Run `my-cli list --full` to see every task
```

`truncateText(body, { full })` does the same for a long text, keeping 500
characters by default and ending on `... (truncated, 8432 chars total)`.

### Home view

Run with no arguments, an agent-facing CLI shows live content, led by which tool
answered:

```ts
import { createOutput, homeHeader } from '@clibuilder/axi'

createOutput(args.format).result({ ...homeHeader({ description: 'Manage plugins' }), plugins })
```

```sh
$ my-cli
bin: ~/.local/bin/my-cli
description: Manage plugins
plugins[2]: plugin-a,plugin-b
```

## API

| Export | What it does |
| --- | --- |
| `OutputFormat` | `'toon' \| 'json' \| 'text'` |
| `formats` | `['toon', 'json', 'text']`, the default first |
| `formatOption` | The `--format` option: choices `toon`, `json`, `text`, default `toon` |
| `defineFormatOption({ default?, description? })` | A `--format` option with another default or wording |
| `createOutput(format, { stdout? })` | Binds a parsed format: `result(value, { help?, toon?, json?, text? })`, `document(content)`, `error(report)` |
| `writeResult(value, format, stdout?)` | Encodes `value` and writes it with a trailing newline |
| `writeDocument(content, stdout?)` | Writes `content` verbatim, ending on a newline |
| `encodeResult(value, format)` | Encodes without writing |
| `renderText(value)` | The `text` rendering |
| `parseFormat(value)` | Validates a format string from outside argv; throws on an unknown one |
| `withHelp(value, help)` / `helpLines(help)` | Appends next steps under `help` / normalizes them to a list |
| `ErrorReport` | `{ message, code, help?, details?, exitCode? }` |
| `errorOutput(report)` | The error as a value: `error`, `code`, details, `help` |
| `encodeError(report, format)` | Encodes an error without writing it |
| `writeError(report, format, stdout?)` | Writes an error on stdout and returns its exit code |
| `createUsageErrorHandler({ format?, stdout? })` | An `onUsageError` that writes usage errors as structured errors, exit code 2 |
| `describeUsageError(error, command)` | One usage error as `{ code, message, help }` |
| `fullOption` | The `--full` option |
| `truncateText(text, { limit?, full? })` | Cuts a text to `limit` (500) characters, with its total size |
| `truncateList(items, { limit, full? })` | Keeps `limit` items and returns `count: N of M total` |
| `orEmpty(items, message)` | The message instead of an empty list |
| `homeHeader({ description, bin?, home? })` | `bin` and `description`, for the home view |
| `collapseHome(path, home?)` | Shortens a path under the home directory to `~/...` |
| `exitCodes` | Re-exported from `clibuilder`: `success` 0, `error` 1, `usage` 2 |

The conventions behind these, and where they came from, are in
[`docs/findings`](docs/findings/README.md).

[clibuilder]: https://github.com/clibuilder/clibuilder
[npm-image]: https://img.shields.io/npm/v/@clibuilder/axi.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@clibuilder/axi
[toon]: https://github.com/toon-format/toon
