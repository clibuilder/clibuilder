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

`@clibuilder/axi` 0.2.1 is published and available, for `clibuilder` 11.

:::caution[v12, unreleased: folded into `clibuilder`]
In `clibuilder` 12 the output, error, usage-error and format parts are built into core, and the value
helpers (truncation, counts, `orEmpty` and the home helpers) move to the
[`clibuilder/axi`](/clibuilder/api/axi/) subpath. The next major of `@clibuilder/axi` needs
`clibuilder` 12, re-exports those helpers from `clibuilder/axi`, and marks every export
`@deprecated`. See [Moving to `clibuilder` 12](#moving-to-clibuilder-12). The package is not deprecated
on npm until v12 ships, so keep using it with `clibuilder` 11. Source:
[axi-native section 4.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#41-decision-where-clibuilderaxis-contents-belong).
:::

## Install

```sh
npm install @clibuilder/axi clibuilder
```

`clibuilder` `^11.5.0` is a peer dependency of 0.2.1. The next major, unreleased, needs `clibuilder`
`^12`. Node.js 20.19 or newer is required.

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
unless the report sets another.

:::note[Unreleased: the error is reported once]
With the next `clibuilder` 11 minor and `@clibuilder/axi` patch, which are not published yet, the
returned error is a [`CliError.reported()`](/clibuilder/guides/failing/#an-error-already-reported), so the
CLI prints nothing more for it. Until then the CLI also logs the error message on stderr as a
diagnostic.
:::

`args.format` is typed `'toon' | 'json' | 'text' | undefined`. `clibuilder` rejects any other value
as a usage error before `run()` is called.

:::note[Unreleased: the result is printed once]
With the next `clibuilder` 11 minor, which is not published yet, `cli({ output: 'axi' })` prints the
value `run()` returns ([the result channel](/clibuilder/api/cli/#the-result-channel)). With the next
`@clibuilder/axi` patch, `output.result()` returns the value marked as already written, so the CLI
prints it once, and `parse()` still resolves to the value. Its return type becomes
`OutputResult<T>`: return it from `run()` rather than reading fields from it. `output.result()` keeps
writing the value itself, so `output: 'console'` and a custom writer are unchanged. A new CLI can
return `result(value, { help, render })` from `clibuilder` instead.
:::

### The global `--format` option

:::caution[Unreleased: `formatOption` conflicts with the global `--format`]
With the next `clibuilder` 11 minor, which is not published yet, `cli({ output: 'axi' })` and
`cli({ format })` turn on [`clibuilder`'s global `--format`](/clibuilder/api/cli/#the-global---format-option).
A command that then declares `format: formatOption` or `format: defineFormatOption()` fails the CLI at
startup. Delete the option and pass `this.format` instead of `args.format`:

```ts
command({
  name: 'list',
  run() {
    return createOutput(this.format).result({ items })
  }
})
```

Pick the default with `cli({ format })` instead of `defineFormatOption({ default })`. With the default
`output: 'console'` and no `cli({ format })`, `formatOption` keeps working as before.
:::

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

:::note[Unreleased: core reports usage errors itself]
On `main`, not in a published release. With `cli({ output: 'axi' })`, `clibuilder` reports usage
errors itself, in the caller's `--format`, so you do not need this handler. If you pass it, it still
takes over. Core reports only the top-ranked error, codes an extra argument `extra-arguments`, and
adds the usage line, the offending `option` or `argument`, and for an invalid value the allowed values
or the constraint. See
[Usage errors with `output: 'axi'`](/clibuilder/guides/failing/#usage-errors-with-output-axi).
:::

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

## Moving to `clibuilder` 12

Unreleased. Each export maps to a `clibuilder` 12 feature:

| `@clibuilder/axi` | `clibuilder` 12 |
| --- | --- |
| `truncateText`, `truncateList`, `defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader`, `collapseHome` | The same names from [`clibuilder/axi`](/clibuilder/api/axi/). `fullOption` is declared with `t.boolean().optional()` |
| `createOutput(format).result(value, { help })`, `writeResult`, `encodeResult`, `withHelp`, `helpLines` | Return the value, or [`result(value, { help, render })`](/clibuilder/api/cli/#the-result-channel), from `run()` |
| `output.document(content)`, `writeDocument` | Return `document(content)` from `run()` |
| `output.error(report)`, `writeError`, `encodeError`, `errorOutput`, `ErrorReport` | Throw a [`CliError`](/clibuilder/guides/failing/#errors-with-output-axi) with `code`, `help` and `details` |
| `formatOption`, `defineFormatOption`, `parseFormat`, `formats`, `OutputFormat` | The [global `--format`](/clibuilder/api/cli/#the-global---format-option): delete the option, read `this.format`, set the default with `cli({ format })`; the type is `cli.Format` |
| `renderText` | `--format text`, or `result(value, { render: { text } })` |
| `createUsageErrorHandler`, `describeUsageError` | Built in: [ranked, coded usage errors](/clibuilder/guides/failing/#usage-errors-with-output-axi). Remove the `onUsageError` handler |
| `exitCodes` | `exitCodes` from `clibuilder` or `clibuilder/axi` |
