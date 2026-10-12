---
title: clibuilder/axi
description: Value helpers that shape what a command returns for an agent — truncation, counts, the empty state and the home header.
---

:::note[Since 12.0.0]
The `clibuilder/axi` subpath ships in `clibuilder` 12.0.0. With `clibuilder` 11.5.0, use the same helpers from [`@clibuilder/axi`](/clibuilder/packages/axi/).
:::

```ts
import { fullOption, homeHeader, orEmpty, result, truncateList } from 'clibuilder/axi'
```

`clibuilder` 12 already renders results, errors and usage errors the agent-facing way with
`output: 'axi'`, the default. The `clibuilder/axi` subpath adds helpers that shape *what* a command returns: cut a
long answer, say how much was left out, state an empty result, and name the tool in its home view.
A CLI that does not import the subpath does not load it.

## Example

```ts
import { cli, command } from 'clibuilder'
import { fullOption, orEmpty, result, truncateList } from 'clibuilder/axi'
import { loadTasks } from './tasks.js' // your own logic

const listCommand = command({
  name: 'list',
  description: 'List the open tasks',
  options: { full: fullOption },
  async run(args) {
    const tasks = await loadTasks(this.cwd)
    const { items, count, truncated } = truncateList(tasks, { limit: 30, full: args.full })
    return result(
      { count, tasks: orEmpty(items, '0 open tasks found') },
      { help: truncated ? 'Run `my-cli list --full` to see every task' : undefined }
    )
  }
})

cli({ name: 'my-cli', version: '1.0.0' }).command(listCommand).parse(process.argv)
```

```sh
$ my-cli list
count: 30 of 847 total
tasks[30]{id,title}:
  ...
help[1]: Run `my-cli list --full` to see every task
```

## Exports

| Export | Purpose |
| --- | --- |
| `truncateText(text, { limit?, full? })` | Cuts a text to `limit` characters and ends it with `... (truncated, N chars total)`. Returns `{ text, truncated }` |
| `defaultTextLimit` | The default `limit` of `truncateText`: 500 |
| `truncateList(items, { limit, full? })` | Keeps `limit` items. Returns `{ items, count, total, truncated }`, with `count` as `N of M total` |
| `fullOption` | The `--full` option, declared as `t.boolean().optional()`. Pass `args.full` to the truncate helpers |
| `orEmpty(items, message)` | The message instead of an empty list |
| `homeHeader({ description, bin?, home? })` | `bin` and `description`, for what the CLI shows when run with no arguments |
| `collapseHome(path, home?)` | Shortens a path under the home directory to `~/...` |
| `result`, `document`, `empty` | The [result channel](/clibuilder/api/cli/#the-result-channel) helpers, re-exported from `clibuilder` |
| `exitCodes`, `CliError`, `isCliError` | Re-exported from `clibuilder` |
| `encode(value, format)`, `errorOutput(fields)`, `printAnswer(returned, format)` | The output contract: encode a value, build the error report, and turn what `run()` returned into the text `output: 'axi'` prints. All synchronous |
| `formats`, `Format` | The formats an answer is encoded in: `toon`, `json`, `text` |
| `runScript(command, { argv?, streams? })` | Runs a command without `cli()`. See [Run a command as a script](#run-a-command-as-a-script) |

## Run a command as a script

`runScript()` runs the same `{ options, run }` object you pass to `cli().command()`, so a command has one
definition and two entries: the cli and a plain script.

```ts
import { t } from 'clibuilder'
import { result, runScript } from 'clibuilder/axi'

process.exitCode = await runScript({
  options: { name: { description: 'Who to greet', type: t.string() } },
  run({ name }) {
    return result({ greeting: `hello ${name}` })
  }
})
```

```sh
$ node greet.js --name bob
greeting: hello bob
$ node greet.js --name bob --format json
{"greeting":"hello bob"}
```

It parses `--format` and the command's options from `argv` (default `process.argv.slice(2)`), calls `run()`,
prints the answer the way `output: 'axi'` does, and resolves to the exit code. It does not set `process.exitCode`.

- `this` is `{ format, ui }` and nothing else. `this.ui` writes to stderr. There is no `config`, `cwd` or `registry`,
  so a command that reads `this.config` is a type error.
- A thrown `CliError` is printed with `errorOutput()` on stdout and resolves to its `exitCode`.
- A bad invocation is printed the same way with code `usage` and resolves to 2. It is a plain
  [args-minus](/clibuilder/packages/args-minus/) message: no ranking and no `help` list.
- Positional `arguments` and `conflicts` are not supported, on purpose: the lookup `cli()` uses for them, and for
  ranked usage errors, would add about 10 KB to a runner capped at 22 KB. An option named `format` is not
  supported either, and `cli()` rejects it too: `--format` is global, so read `this.format`. A test runs one
  command through both `cli().command()` and `runScript()` and checks that the answers and `CliError` reports match.
- Any other error rejects.

The runner and the output contract import only `args-minus`, `@toon-format/toon` and each other, so a script
that imports `clibuilder/axi` does not load `cli()`. A test keeps the bundled and minified runner under 22 KB.

## No framework imports

The helpers live in `packages/clibuilder/src/axi/`. Those files import only Node built-ins and each
other, never the rest of `clibuilder`, and a lint rule in `biome.json` enforces that. A package that
does not use `clibuilder` can later reuse them by moving the files. Only the subpath entry adds
`fullOption` and the re-exports.

A second tier is also kept free of the framework: `render/{encode,answer,text}.ts`, `app/errors.ts` and
`src/script/`. They may import `args-minus`, `@toon-format/toon` and the files above, and never `cli`, `app`,
`invocation`, `config` or `help`. Source:
[axi-native section 4.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#41-decision-where-clibuilderaxis-contents-belong).
