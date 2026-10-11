---
title: "@clibuilder/axi"
description: "Agent-facing output conventions (AXI) for clibuilder CLIs: results, errors and usage errors on stdout in the format the caller asked for."
---

`@clibuilder/axi` adds agent-facing output conventions to a `clibuilder` CLI. It follows
[AXI](https://github.com/kunchenguid/axi), a set of design principles for CLIs that agents call.
`clibuilder` already sets the exit codes. This package covers what the caller reads on stdout:

- the result, encoded in the format the caller asked for;
- the next steps, as `help` lines after the result;
- an error with a stable `code` the caller can branch on;
- a count that says how much was left out of a long answer.

There are three formats. `toon` is the default: [TOON](https://github.com/toon-format/toon), a
compact encoding that costs an agent fewer tokens to read. `json` is compact JSON, for a pipe into
`jq`. `text` is an aligned report for a person.

`@clibuilder/axi` 0.2.0 is published and available.

## Install

```sh
npm install @clibuilder/axi clibuilder
```

`clibuilder` 11 is a peer dependency: `^11.3.3` for the published 0.2.0, and `^11.4.0` on `main` for
the next release. Node.js 20.19 or newer is required.

## Example

Two commands: `list` cuts a long list and offers `--full`, and `show` reports a missing task as an
error on stdout.

```ts
import { createOutput, formatOption, fullOption, orEmpty, truncateList } from '@clibuilder/axi'
import { cli, command } from 'clibuilder'
import { loadTasks } from './tasks.js' // your own logic

const listCommand = command({
  name: 'list',
  description: 'List the open tasks',
  options: { format: formatOption, full: fullOption },
  async run(args) {
    const tasks = await loadTasks(this.cwd)
    const { items, count, truncated } = truncateList(tasks, { limit: 30, full: args.full })
    return createOutput(args.format).result(
      { count, tasks: orEmpty(items, '0 open tasks found') },
      { help: truncated ? 'Run `my-cli list --full` to see every task' : undefined }
    )
  }
})

const showCommand = command({
  name: 'show',
  description: 'Show one task',
  arguments: [{ name: 'id', description: 'task id' }],
  options: { format: formatOption },
  async run(args) {
    const output = createOutput(args.format)
    const task = (await loadTasks(this.cwd)).find((t) => String(t.id) === args.id)
    if (!task) {
      throw output.error({
        message: `no task ${args.id}`,
        code: 'not-found',
        help: 'Run `my-cli list` to see the open tasks'
      })
    }
    return output.result(task)
  }
})

cli({ name: 'my-cli', version: '1.0.0' })
  .command(listCommand)
  .command(showCommand)
  .parse(process.argv)
```

```sh
$ my-cli list
count: 30 of 847 total
tasks[30]{id,title}:
  ...
help[1]: Run `my-cli list --full` to see every task

$ my-cli show 9999
error: no task 9999
code: not-found
help[1]: Run `my-cli list` to see the open tasks
```

`output.error()` writes the error on stdout and returns a `CliError` to throw. Its exit code is 1
unless the report sets another. In `clibuilder` 11, the CLI also logs the error message on stderr as
a diagnostic.

`args.format` is typed `'toon' | 'json' | 'text' | undefined`. `clibuilder` rejects any other value
as a usage error before `run()` is called.

## Exports

### Output

| Export | Purpose |
| --- | --- |
| `createOutput(format, { stdout? })` | Binds a format. Returns `result(value, { help?, toon?, json?, text? })`, `document(content)` and `error(report)` |
| `encodeResult(value, format)` | Encodes a value without writing it |
| `writeResult(value, format, stdout?)` | Encodes a value and writes it with a trailing newline |
| `writeError(report, format, stdout?)` | Writes an error on stdout and returns its exit code |
| `writeDocument(content, stdout?)` | Writes content verbatim, ending on a newline. Use it for a Markdown body or a diff that is already the answer |

`result()` returns the value it wrote, so a test can assert on the command's return value. Pass a
`stdout` writer to `createOutput` to capture the output instead.

### Errors and usage errors

| Export | Purpose |
| --- | --- |
| `ErrorReport` | `{ message, code, help?, details?, exitCode? }` |
| `errorOutput(report)` | The error as a value: `error`, `code`, the details and `help` |
| `encodeError(report, format)` | Encodes an error without writing it |
| `createUsageErrorHandler({ format?, stdout? })` | An [`onUsageError`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) handler that writes each usage error as a structured error, with exit code 2 |
| `describeUsageError(error, command)` | One usage error as `{ code, message, help }` |

```ts
import { createUsageErrorHandler } from '@clibuilder/axi'
import { cli } from 'clibuilder'

cli({ name: 'my-cli', version: '1.0.0', onUsageError: createUsageErrorHandler() })
```

The handler runs before `--format` is parsed, so it writes `toon` unless you build it with another
`format`.

### Format

| Export | Purpose |
| --- | --- |
| `OutputFormat` | `'toon' \| 'json' \| 'text'` |
| `formats` | `['toon', 'json', 'text']`, the default first |
| `formatOption` | The `--format` option: choices `toon`, `json` and `text`, default `toon` |
| `defineFormatOption({ default?, description? })` | A `--format` option with another default or description |
| `parseFormat(value)` | Validates a format string that did not come from argv. Throws on an unknown one |
| `renderText(value)` | The `text` rendering of a value |

### Help lines

| Export | Purpose |
| --- | --- |
| `helpLines(help)` | Turns a string or a list of next steps into a list |
| `withHelp(value, help)` | Adds the next steps to a value under `help` |

### Value helpers

| Export | Purpose |
| --- | --- |
| `truncateText(text, { limit?, full? })` | Cuts a text to `limit` characters and ends it with `... (truncated, N chars total)` |
| `defaultTextLimit` | The default `limit` of `truncateText`: 500 |
| `truncateList(items, { limit, full? })` | Keeps `limit` items and returns `count` as `N of M total` |
| `fullOption` | The `--full` option, which turns truncation off |
| `orEmpty(items, message)` | The message instead of an empty list |
| `homeHeader({ description, bin?, home? })` | `bin` and `description`, for what the CLI shows when run with no arguments |
| `collapseHome(path, home?)` | Shortens a path under the home directory to `~/...` |

The package also re-exports `exitCodes` from `clibuilder`. The
[package README](https://github.com/clibuilder/clibuilder/tree/main/packages/axi#readme) has more
examples, and [`docs/findings`](https://github.com/clibuilder/clibuilder/tree/main/packages/axi/docs/findings)
records where each convention came from.

## Status and v12

**Planned for v12:** `@clibuilder/axi` is planned to be folded into `clibuilder` core. The output,
error, usage-error and format parts are expected to be built into core, so `clibuilder` 12 prints
results and errors in these formats itself. The truncation and home helpers are the part whose home
is still undecided: they may stay in this package or move. See
[section 4 of the axi-native RFC](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#4-what-moves-in-one-table)
and the [v12 roadmap](/clibuilder/roadmap/v12/).

`@clibuilder/axi` is not deprecated on npm. If you use it today, keep using it until v12.
