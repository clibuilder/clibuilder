---
title: clibuilder/axi
description: Value helpers that shape what a command returns for an agent — truncation, counts, the empty state and the home header.
---

:::note[v12, unreleased]
The `clibuilder/axi` subpath is on `main` and ships in `clibuilder` 12. It is not in a published
release. With `clibuilder` 11.5.0, use the same helpers from [`@clibuilder/axi`](/clibuilder/packages/axi/).
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
| `exitCodes` | Re-exported from `clibuilder` |

## No framework imports

The helpers live in `packages/clibuilder/src/axi/`. Those files import only Node built-ins and each
other, never the rest of `clibuilder`, and a lint rule in `biome.json` enforces that. A package that
does not use `clibuilder` can later reuse them by moving the files. Only the subpath entry adds
`fullOption` and the re-exports. Source:
[axi-native section 4.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#41-decision-where-clibuilderaxis-contents-belong).
