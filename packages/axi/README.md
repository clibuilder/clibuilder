# @clibuilder/axi

[![NPM version][npm-image]][npm-url]

Agent-facing output conventions (AXI) for [`clibuilder`][clibuilder] CLIs.

`clibuilder` already owns half of an agent-facing CLI's contract: its exit codes.
This package holds the other half — a machine-readable result on stdout, in the
format the caller asked for:

- `toon` (default) — [TOON][toon], the cheapest read for an agent.
- `json` — compact JSON, for a pipe into `jq`.
- `text` — an aligned, human-readable report.

## Install

```sh
npm install @clibuilder/axi clibuilder
```

`clibuilder` is a peer dependency. Node.js `>= 20.19`.

## Usage

Spread `formatOption` into a command's options, and write the result through
`createOutput`:

```ts
import { createOutput, exitCodes, formatOption } from '@clibuilder/axi'
import { command } from 'clibuilder'
import { findPlugins } from './plugins.js' // your own logic

export const listCommand = command({
	name: 'list',
	description: 'List the installed plugins',
	options: { format: formatOption },
	async run(args) {
		const plugins = await findPlugins(this.cwd)
		if (plugins.length === 0) return exitCodes.error
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

## API

| Export | What it does |
| --- | --- |
| `OutputFormat` | `'toon' \| 'json' \| 'text'` |
| `formats` | `['toon', 'json', 'text']`, the default first |
| `formatOption` | The `--format` option: choices `toon`, `json`, `text`, default `toon` |
| `defineFormatOption({ default?, description? })` | A `--format` option with another default or wording |
| `createOutput(format, { stdout? })` | Binds a parsed format: `result(value, renderers?)`, `document(content)` |
| `writeResult(value, format, stdout?)` | Encodes `value` and writes it with a trailing newline |
| `writeDocument(content, stdout?)` | Writes `content` verbatim, ending on a newline |
| `encodeResult(value, format)` | Encodes without writing |
| `renderText(value)` | The `text` rendering |
| `parseFormat(value)` | Validates a format string from outside argv; throws on an unknown one |
| `exitCodes` | Re-exported from `clibuilder`: `success` 0, `error` 1, `usage` 2 |

[clibuilder]: https://github.com/clibuilder/clibuilder
[npm-image]: https://img.shields.io/npm/v/@clibuilder/axi.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@clibuilder/axi
[toon]: https://github.com/toon-format/toon
