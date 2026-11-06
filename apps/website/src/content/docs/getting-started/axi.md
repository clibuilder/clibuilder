---
title: AXI Conventions
description: "The agent-facing output conventions clibuilder 12 follows: upstream AXI's ten rules, three changes to them, and what clibuilder does for each."
---

AXI (Agent eXperience Interface) is a set of rules for a CLI whose main caller is an AI agent. The
agent runs a shell command, reads stdout, and decides what to do next. Every extra call costs it a
tool invocation, a re-read and more reasoning, so the rules aim to answer in one call.

`clibuilder` 12 follows these rules by default, with `output: 'axi'`. It follows its own version of
them, and this page defines that version:

- The ten rules of [upstream AXI](https://github.com/kunchenguid/axi), as its
  [specification](https://github.com/kunchenguid/axi/blob/main/.agents/skills/axi/SKILL.md) states them.
- Three changes to those rules, set out in
  [Where this version changes upstream](#where-this-version-changes-upstream).
  Upstream has not adopted the changes.

This page says what each rule asks for, what `clibuilder` does about it, and what is left to you.
It does not repeat the API: each row links to the page that documents it.

## The ten rules

Some rules are about the shape of the output. Core handles those for every command. Others are about
what a command says, and only your command knows that. For those, the
[`clibuilder/axi`](/clibuilder/api/axi/) subpath gives you helpers.

| # | Rule | What `clibuilder` 12 does | Your part |
| --- | --- | --- | --- |
| 1 | **Token-efficient output.** TOON on stdout. | `--format` defaults to `toon`, encoded with the official `@toon-format/toon` encoder. `json` and `text` are the other formats. See [The global `--format` option](/clibuilder/api/cli/#the-global---format-option). | None. See [change 1](#change-1-toon-only-for-collections) for where this version narrows the rule. |
| 2 | **Minimal default schemas.** Three or four fields per list item. | Nothing. There is no built-in `--fields` option. | Choose the keys your command returns. |
| 3 | **Content truncation.** Cut long text, say how much was cut, offer `--full`. | `truncateText()`, `truncateList()` and `fullOption` in [`clibuilder/axi`](/clibuilder/api/axi/). Core never truncates. | Call the helpers, and add the `--full` hint when something was cut. |
| 4 | **Pre-computed aggregates.** Give the total, such as `count: 30 of 847 total`. | `truncateList()` returns that `count` string. | Put the count, and any cheap derived status, in your answer. |
| 5 | **Definitive empty states.** Say the zero, with context. | `empty()` from `clibuilder`, and `orEmpty()` from `clibuilder/axi`. A bare empty list gets no special handling. | Return `empty('0 open tasks found')` instead of an empty list. |
| 6 | **Structured errors and exit codes.** Errors on stdout, no prompts, unknown flags rejected, exit `0`, `1` or `2`. | Core reports one coded error on stdout, in the caller's format. It rejects unknown options and reports only the top-ranked usage error. It exits `0`, `1` or `2`, and it never prompts. See [Failing](/clibuilder/guides/failing/). | Throw a `CliError` with a `code` and a `help` line when the command cannot finish. A code above `2` is yours to define. |
| 7 | **Ambient context.** An opt-in setup command installs session hooks. | Nothing. | Write the setup command yourself, if your CLI needs one. |
| 8 | **Content first.** A bare invocation shows live data, not a manual. | A command with a `run()` runs when invoked bare. A group with no `run()` is a `missing-command` usage error that lists its sub-commands. See [Command groups](/clibuilder/guides/commands/#command-groups). | Give the root a [default command](/clibuilder/guides/commands/#the-default-command) that returns live data. |
| 9 | **Contextual disclosure.** A few next steps after the output. | `result(value, { help })` encodes `help[N]` inside the answer. `ref()` builds a command line and checks it against the command tree. See [The result channel](/clibuilder/api/cli/#the-result-channel). | Choose the next steps. See [change 3](#change-3-suggestions-pruned-by-validity). |
| 10 | **Consistent help.** Per-command `--help`, a home header, a fast `--version`. | `--help` works on every command, and is structured data in `toon` and `json`. A bare `--version` is answered before config and plugins load. `homeHeader()` builds the `bin:` and `description:` lines. See [`--help` and `--version`](/clibuilder/api/cli/#--help-and---version-with-output-axi). | Add [`examples`](/clibuilder/api/command/#examples) to your commands, and `homeHeader()` to your home view. |

## Where this version changes upstream

Each change comes from measuring the rules against what a CLI emits. The sections below state each
rule, the reason for it, and where `clibuilder` 12 stands on it.

### Change 1: TOON only for collections

**The rule.** Use TOON's tabular form for collections. Use plain `key: value` lines for single objects,
errors and empty states.

**Why.** TOON saves 26 to 38% over compact JSON on a list. Its `tasks[15]{number,title,state}:` header
also gives the row count and the fields, so an agent can tell when rows are missing. A single object has
nothing tabular to factor out. On a seven-field detail view TOON costs 85 tokens, against 78 for plain
lines, because the encoder quotes any string that holds a delimiter such as `: `. An error costs 24
tokens in TOON and 20 as plain lines.

**In `clibuilder` 12.** Not applied. In `toon`, core encodes every answer with the official encoder,
including single objects and errors. That keeps core's output in line with the TOON specification.
The decision is recorded in the
[axi-native RFC](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#10-open-questions),
open question 4.

To print one answer as plain lines in `toon`, give it a renderer:

```ts
import { result } from 'clibuilder'

return result(task, {
  render: { toon: (t) => Object.entries(t).map(([k, v]) => `${k}: ${v}`).join('\n') }
})
```

`--format text` also prints an object as `key: value` lines, but it prints a list of records as an
aligned table, not as TOON.

### Change 2: disclosure scoped to the node

**The rule.** Never disclose more of the command tree than the node the agent is on:

- **Shallow groups.** Name commands `noun verb`. Two levels is the target and three the ceiling. Prefer a
  flag to a level, so `pane list --dead`, not `pane dead list`. Use the same verbs across nouns.
- **Live data at every node, with the node's verbs attached.** A bare group shows its data, followed by its
  own commands. List names and required arguments only, and only on a bare group.
- **A node's `--help` is that node's schema.** It gives full signatures for that node's commands.
- **No whole-surface command.** Nothing prints the entire command tree in one answer.

**Why.** Each level the agent has to walk costs a call. Printing the whole surface at once moves that
cost instead of removing it: the agent then chooses among every command, and selection accuracy falls
as the choices grow. On a 66-command surface, one resource's slice was 11 times smaller than the whole,
and walking all twelve resources one by one cost only 9% more than the whole surface in one answer.

**In `clibuilder` 12.** Partly applied:

- `--help` is scoped to the command it is called on. For a group, its `commands` key lists only that
  group's sub-commands, with their names and the first line of their descriptions. It does not give
  their arguments, flags or exit codes.
- There is no command that prints the whole tree.
- A group may have its own `run()`, so a bare group can return live data. `clibuilder` does not attach
  the group's verbs to that answer. Return them yourself if you want them there.
- A group without a `run()` is a `missing-command` usage error, not live data.

How deep to nest and what to call each level is your design. See
[Naming Commands](/clibuilder/guides/naming-commands/).

### Change 3: suggestions pruned by validity

**The rule.** Offer only the next steps that will succeed against the object just returned. A closed
task's answer does not offer to close it.

**Why.** An irrelevant suggestion costs the agent a moment of reading. An invalid one costs a failed
command, an error and a recovery. This change rests on reasoning, not measurement.

**In `clibuilder` 12.** A `ref()` is checked against the command tree when the answer is printed. A path
that names no command, or an option the command does not have, throws, so your tests catch it. Whether a
step is valid for this object depends on its state, and only `run()` knows that. Choose the refs from it:

```ts
import { ref, result } from 'clibuilder'

run({ id }) {
  const task = getTask(id)
  return result(task, {
    help: task.state === 'open'
      ? [ref('task close', { id }, 'close it')]
      : [ref('task reopen', { id }, 'reopen it')]
  })
}
```

## What `clibuilder` adds

These are not AXI rules. They are what `clibuilder` does where AXI says nothing, or where it gives a choice:

- **A choice of format.** Upstream AXI is TOON only. `clibuilder` also has `--format json` for programs
  and `--format text` for people. The format is the same on a terminal and in a pipe: there is no TTY
  detection.
- **A second output mode.** `output: 'console'` keeps the `clibuilder` 11 behavior. See
  [Output modes](/clibuilder/guides/upgrade-to-12/#output-modes-axi-is-the-default).
- **Error codes.** The error keys match axi-sdk-js: `error`, `code` and `help`, with any details
  between `code` and `help`. The codes are kebab-case strings, such as `unknown-option` and `invalid-value`, not the SDK's `VALIDATION_ERROR`.
  See [Usage errors](/clibuilder/guides/failing/#usage-errors).
- **`next[N]{run,why}`.** With `cli({ refs: 'next' })`, refs are encoded as a table instead of
  `help` lines. See [Next steps as command lines](/clibuilder/api/cli/#next-steps-as-command-lines-ref).

To move a `clibuilder` 11 CLI to these defaults, see [Upgrading to 12](/clibuilder/guides/upgrade-to-12/).
