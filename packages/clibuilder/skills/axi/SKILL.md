---
name: axi
description: Design or review CLI output that an AI agent reads, using clibuilder's version of the AXI (Agent eXperience Interface) conventions — TOON output, minimal fields, truncation with counts, definitive empty states, coded errors and exit codes, next-step suggestions, and a live home view. For requests like "make my CLI agent-friendly", "review this command's output for agents", "apply AXI to this CLI", or "what should this command print when nothing is found".
---

# AXI for CLIs, clibuilder version

AXI is a set of rules for a CLI whose main caller is an AI agent, so each command answers in one call. clibuilder 12 follows the ten upstream rules with three changes, and `cli({ output: 'axi' })` is the default. For a CLI not built on clibuilder the rules still apply, and you implement each one by hand. General clibuilder usage is in the `build-cli` skill.

Helpers: `import { fullOption, homeHeader, orEmpty, truncateList, truncateText, result, empty, ref, CliError, exitCodes } from 'clibuilder/axi'`.

## The ten rules

1. Token-efficient output. clibuilder: `--format` defaults to `toon`, with `json` and `text` also available. You: nothing.
2. Minimal default schemas. clibuilder: nothing. You: return three or four fields per list item.
3. Content truncation. clibuilder: `truncateText()`, `truncateList()` and `fullOption`; core never truncates. You: call them, add `options: { full: fullOption }`, and hint `--full` when something was cut.
4. Pre-computed aggregates. clibuilder: `truncateList()` returns `count` as `30 of 847 total`. You: put the count and any cheap derived status in the answer.
5. Definitive empty states. clibuilder: `empty(message)` and `orEmpty(items, message)`. You: say the zero with context, such as `empty('0 open tasks found')`, never a bare empty list.
6. Structured errors and exit codes. clibuilder: one coded error on stdout in the caller's format, unknown options rejected, no prompts, exit 0, 1 or 2. You: throw `CliError` with `code`, optional `details` and `help`. An `exitCode` above 2 is yours to define.
7. Ambient context. clibuilder: nothing. You: write an opt-in setup command that installs session hooks, if the CLI needs one.
8. Content first. clibuilder: a command with `run()` runs when invoked bare. You: give the root a default command that returns live data.
9. Contextual disclosure. clibuilder: `result(value, { help })` encodes `help[N]`, and `ref()` builds a command line. Under `cli()`, a ref naming an unknown command or option throws when the answer is printed, so tests catch it. Refs do not take positional arguments yet: pass the target as an option. You: choose a few next steps.
10. Consistent help. clibuilder: `--help` on every command (structured in `toon` and `json`), a fast bare `--version`, and `homeHeader()`. You: add `examples` to commands and `homeHeader({ description })` to the home view.

## Three changes from upstream

These differ from upstream AXI. Follow them, not upstream.

- **Change 1: TOON only for collections.** Encode lists of records as TOON tables, such as `tasks[15]{number,title,state}:`. Print single objects, errors and empty states as plain `key: value` lines, because TOON costs more on them. clibuilder does this in `toon` since 12.2.0; use `result(value, { render: { toon } })` to override one answer.
- **Change 2: disclosure scoped to the node.** Show no more of the command tree than the node the agent is on. Name commands `noun verb`, two levels as the target and three as the ceiling, and prefer a flag to a level (`pane list --dead`). A bare group shows live data, then its own verbs only. A node's `--help` is that node's schema. There is no command that prints the whole tree. Give a group a `run()` returning `result()` or `empty()`, and core appends its valid sub-commands to `help`. A group without `run()` is a `missing-command` usage error.
- **Change 3: suggestions pruned by validity.** Offer only next steps that will succeed for the object just returned. A closed task does not offer `close`. The tree check catches a wrong path or option, but only `run()` knows the object's state, so pick the refs from it.

## Worked example

```ts
import { command, CliError, exitCodes } from 'clibuilder'
import { fullOption, empty, ref, result, truncateList } from 'clibuilder/axi'

export const list = command({
  name: 'list',
  description: 'List open tasks',
  options: { full: fullOption },
  examples: [{ command: 'my-cli task list', description: 'Show open tasks' }],
  async run(args) {
    const tasks = await loadTasks()
    if (tasks.length === 0) return empty('0 open tasks found')
    const { items, count, truncated } = truncateList(tasks, { limit: 30, full: args.full })
    const help = [ref('task get', { id: items[0].id }, 'inspect one')]
    if (truncated) help.push(ref('task list', { full: true }, 'see every task'))
    return result({ count, tasks: items }, { help })
  }
})

// in task get (declares an `id` option): fail with a code and a fix
throw new CliError(`no task ${id}`, { code: 'not-found', exitCode: exitCodes.error, details: { id }, help: ref('task list', {}, 'see valid ids') })
```

The list prints `count`, a `tasks[N]{...}` table and `help[N]`. The error prints `error:`, `code:`, the details and `help[N]` on stdout.

## Reviewing a CLI

Report each rule or change the CLI breaks by its number, with the command, what it prints now, and the fix.

## Further reading

- https://clibuilder.github.io/clibuilder/getting-started/axi/
- https://clibuilder.github.io/clibuilder/api/axi/

## Done when

Before reporting done, check each of these against the result. Report any that fails.

- **C1.** A bare invocation of the CLI or of a group returns live data, not a manual.
- **C2.** Every list answer has a count and few fields per item, and a list that can be cut takes `--full` through `fullOption`.
- **C3.** Every empty answer comes from `empty()` or `orEmpty()` with a message that names the zero.
- **C4.** Every failure throws `CliError` with a `code` and a `help` line, and nothing prompts.
- **C5.** Every suggested next step is a `ref()` to an action valid for the object returned.
- **C6.** A review names each broken rule or change by its number.
