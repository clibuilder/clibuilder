# RFC: make clibuilder AXI-native for the next major

- **Status:** Accepted. Maintainer decisions recorded 2026-10-11; the items in [section 10](#10-open-questions) are still open. Design only; no code changes.
- **Target:** `clibuilder@12` (breaking), shipped with [slim-dependencies](slim-dependencies.md)
- **Issue:** [#639](https://github.com/clibuilder/clibuilder/issues/639)
- **Related:** [#667](https://github.com/clibuilder/clibuilder/issues/667) (where `@clibuilder/axi`'s contents belong, section 4.1); [#636](https://github.com/clibuilder/clibuilder/pull/636) (`@clibuilder/axi` completion) and its [findings](../../packages/axi/docs/findings/README.md); #607, #608, #609, #614
- **Scope:** the nine friction points in #639, and what each one changes in core versus `@clibuilder/axi`. Not the dependency work, though section 8 checks the two plans against each other.

## Decisions

Recorded by the maintainer on 2026-10-11. Each row is described in full in the section it points to.

| # | Decision | Section |
|---|---|---|
| 1 | Default format is `toon`. The CLI author overrides it with `cli({ format })`. | 3.4 |
| 2 | A plain non-`undefined` return from `run()` is printed in `this.format`. `result(value, { render })` controls the printed form; `document()` and `empty()` cover the other cases. In `console` mode returns are not printed. A thrown `CliError` is rendered once by core. | 3.1, 3.5 |
| 3 | Core depends on `@toon-format/toon` and uses it for every toon output, including single objects and errors. | 3.4 |
| 4 | A bad `--format` value is a usage error in the CLI's default format: exit 2, code `invalid-value`, with the valid choices. | 3.2 |
| 5 | `-f` is not reserved for `--format`. | 3.4 |
| 6 | Core keeps exit codes 0, 1 and 2 only. `CliError.exitCode` accepts any integer from 1 to 255. No named set above 2, in core or in axi. | 3.6 |
| 7 | The version fast path answers only a bare `--version` or `-v`, before config and plugins load, in plain text. | 3.8 |
| 8 | In `output: 'axi'` mode every `ui.*` call is a diagnostic on stderr. Answers go to stdout. | 3.10 |
| 9 | `cli({ output: 'axi' \| 'console' })`, default `'axi'`. Both modes are permanent. The level-to-stream routing is internal in v12. | 3.10 |
| 10 | standard-log is replaced by a built-in UI over `cli({ streams })`. | 3.10, [slim-dependencies section 4](slim-dependencies.md#4-logging-standard-log-and-standard-log-color) |
| 11 | Core owns `--help` and `--version` as answers on stdout. `showHelp` and `showVersion` are deprecated; they stay on `ui` in v12 and leave it in a later major. Usage errors no longer print the full help. | 3.3, 3.7 |
| 12 | `@clibuilder/axi` is folded into core in v12. The output, error, usage and format parts are built into core. The value helpers move to a `clibuilder/axi` subpath whose modules import nothing from the framework. `@clibuilder/axi` is deprecated on npm only when v12 ships. | 4, 4.1 |
| 13 | clibuilder does not wrap or depend on axi-sdk-js. It aligns the error keys and adds a conformance test. | 9 |
| 14 | zod is replaced by the `t` descriptors from `args-minus`. A descriptor converts the raw string; `.check()` only validates. Both may be async. A conversion that reads files, resolves paths against `cwd`, calls the network or depends on other options belongs in `run()` and throws a `CliError`. | 3.1, [slim-dependencies section 3.4](slim-dependencies.md#34-design-c) |
| 15 | Only the top-ranked usage error is reported. It carries a `help` list with the command's usage line and, for `invalid-value`, the option, the raw value, and the violated constraint or the allowed values. | 3.3 |

## 1. Summary

`@clibuilder/axi` 0.2 layers the AXI conventions on top of clibuilder. Six CLIs were surveyed and each rebuilds the same pieces, because clibuilder's defaults point the other way: errors and usage errors go to stderr as prose, there is no shared `--format`, and `run()` return values are not an output channel.

**Design.**

- **Core owns the contract.** Anything that has to happen *inside* `parse()`, or that every CLI must agree on to be readable by an agent, is part of `clibuilder@12`: error rendering, usage-error ranking and rendering, the resolved `--format`, the result channel and its helpers, the version fast path, stream routing and EPIPE.
- **The value helpers move to a `clibuilder/axi` subpath.** Truncation, `count: N of M total`, `orEmpty`, home header and collapse. They shape *what* a command says, and none of them needs to run inside `parse()` (section 4.1).
- **One major.** The defaults flip in `clibuilder@12`, together with the dependency slimming. v11 minors add the pieces first behind gates, so most of the work can be adopted and tested before the flip.
- **Two permanent output modes.** `cli({ output: 'axi' })` is the default. `cli({ output: 'console' })` keeps today's behaviour. Neither is deprecated; the difference between them is a routing table and a usage-error renderer.

| # | Friction point | Design | Lives in |
|---|---|---|---|
| 1 | Errors reported twice | `CliError` carries the structured report; core renders it once | core |
| 2 | Usage errors ignore `--format` | Resolve global options before usage errors are reported | core |
| 3 | Usage errors are prose on stderr | Built-in ranked, coded error on stdout, exit 2 | core |
| 4 | `--format` is not first-class | One global `--format`, resolved value on `this.format` | core (option, json, text, toon) |
| 5 | No result channel | A returned value is printed; `result`, `document`, `empty` | core (envelope, `help[N]`); `clibuilder/axi` subpath (truncation, counts, home) |
| 6 | Exit codes stop at 2 | Core keeps 0, 1, 2; `exitCode` is open from 1 to 255 | core |
| 7 | Help is not agent-shaped | `examples` field, structured `--help` under `--format` | core |
| 8 | No version fast path | Answer a bare `--version` before config and plugins load | core |
| 9 | EPIPE not handled | Exit 0 quietly on a closed stdout | core |

## 2. How it works today

Read from `packages/clibuilder/src/app/builder.ts` at `e4afa97` (then under `ts/`).

1. `parse()` first awaits `pending`, which is the config load and every plugin activation. Nothing else can happen before that.
2. `parseArgv` tokenizes; `lookupCommand` runs on the **base command** (`help`, `version`, `verbose`, `silent`, `debug-cli`, `show-config`) and then on the matched command. Only the base lookup's results are read for `--silent`, `--verbose` and `--debug-cli`.
3. `--version` and `--help` are answered next, through `ui.info`.
4. Usage errors are collected from the matched command's lookup. A malformed global option under a sub-command is swapped in from the base lookup (#634, the fix for #614). Then either the `onUsageError` handler runs, or each error goes to `ui.error`, followed by the full help, and the cli exits 2.
5. The command runs. A thrown `CliError` is caught: the message and the help lines go to `ui.error`, and the cli exits with `exitCode`. Any other throw propagates. A returned value is passed straight back to the caller of `parse()`; nothing prints it.
6. `ui` is a standard-log logger. `info` is effectively stdout, `warn` and `error` are stderr.

The `format` option exists only as an internal `formatOption` for the `plugins` builtins (`render/format.ts`, default `toon`). It is not a global option.

## 3. The nine friction points

### 3.1 Errors are reported twice (#639.1)

**Today.** `output.error(report)` in axi writes the structured error to stdout and returns a `CliError`; clibuilder then logs `e.message` and `e.help` to stderr (`builder.ts`, the `catch`).

**Design: core renders errors, once.**

- `CliError` is the structured report: `message`, `code` (stable kebab-case string), `details` (flat key/value), `help` (string or string[]), `exitCode`.
- `throw new CliError(report)` is the only way a command reports a failure. Core encodes it once, in the resolved format, on stdout (section 3.4), and writes nothing to stderr for it.
- The encoded keys are `error` (the message), `code`, the `details` fields, and `help[N]`. These match axi-sdk-js (section 9).
- A debugging copy is available under `--verbose`, as a `debug` line on stderr.
- A failure the parser cannot detect is a `CliError` from `run()`: a check that reads a file, resolves a path against `cwd`, uses the network or depends on another option. The parser handles only conversions of one raw string and checks of the converted value; both may be async. A check that throws or rejects is a runtime error, not a usage error ([slim-dependencies section 3.4](slim-dependencies.md#34-design-c)).
- In `output: 'console'` mode the message and help go to stderr as today (section 3.10).

**In core:** the report shape and the encoding, absorbed from axi's `ErrorReport` and `errorOutput`. Translating backend failures into reports ("backend text must be translated, not forwarded") is a convention for the CLI author, not a framework feature.

### 3.2 Usage errors cannot honour `--format` (#639.2)

**Today.** `onUsageError(errors, { command, ui })` runs with no knowledge of the format, because `--format` is a per-CLI option that the matched command's lookup has not necessarily parsed yet, and the handler is built before the CLI runs.

**Design: resolve the global options first, and pass them in.**

- Global options (`help`, `version`, `verbose`, `silent`, `debug-cli`, `show-config`, and the new `format`) are all read from the **base lookup** before the matched command's errors are looked at. The code already does this for the logging flags; `format` joins them.
- The handler context gains `format`: `{ command, ui, format }`. Core uses the same resolved value for its default renderer.
- A bad `--format` value is itself a usage error. Core reports it in the CLI's default format (the `cli({ format })` value, `toon` unless changed): exit 2, code `invalid-value`, and the valid choices. Because the default format is always valid, this cannot loop.
- Because the base lookup is already the source of truth for #614, this is the same ordering fix, not a second mechanism. The #614 swap-in logic collapses into "base errors win for global keys".

### 3.3 Usage errors default to prose plus help on stderr (#639.3)

**Design: the ranked, coded error on stdout is the default.**

- Core takes the ranking from `@clibuilder/axi`'s `usage.ts`: unknown option, conflicting options, invalid value, expect single, missing argument, extra arguments.
- **Only the top-ranked error is reported.** Later errors are usually caused by the first (cyber-mux #194), so core does not collect every failure.
- **The error carries enough to fix more than one mistake.** Its `help` list holds the command's usage line, and for `invalid-value` the allowed values or the violated constraint, for example `allowed: low, normal, high` or the range. An agent with two independent mistakes can often fix both in one turn.
- Output: `error`, `code`, the offending key or name, and `help[N]` lines. Exit 2, stdout, in the resolved format.
- **Codes stay separate:** `unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument`, `extra-arguments`. A runtime can map each one on its own.
- **`invalid-value` fields:** the option name, the raw value as typed, the violated constraint or the check's message, and the allowed values when the option is an enum. A failed descriptor conversion, range, pattern or `.check()` reports this code, and so does a `t.custom` that throws a plain `Error` (proposed). A foreign schema's issues are mapped into it, never forwarded raw.
- The full help is no longer printed after a usage error, after a config-validation failure, or for a bare command group. The coded error lists the valid options or arguments instead, which is what the agent needed from the help.
- `cli({ onUsageError })` stays, for CLIs that want their own rendering. `UsageError` gains the `code` strings above next to the existing `type`, and its `keyType` becomes the descriptor's `kind` string (slim-dependencies section 3.4).
- `@clibuilder/axi`'s `createUsageErrorHandler` and `describeUsageError` are built into core.
- In `output: 'console'` mode, usage errors keep today's renderer: prose plus the full help on stderr.

### 3.4 `--format` is not first-class (#639.4)

**Design: one global `--format`, declared by core.**

- `--format <toon|json|text>` joins the base command, so it is accepted by every command and shown once in help. The alias `-f` is **not** reserved (it is commonly a command's own `--force` or `--file`).
- The resolved value is on `this.format` in `run()` and in the usage-error context.
- **Default `toon`.** This matches the existing builtin default and the EFF measurements, and it keeps agent output cheap. A CLI changes it with `cli({ format: 'text' })`.
- **No TTY or agent detection.** Universal-plugin ADR-0005 rejected it, and the survey found none. The format is the same on a terminal and a pipe, so output is reproducible.
- **Encoders.** Core ships `json`, `text`, and `toon`. `toon` uses the official `@toon-format/toon` encoder for every value, including single objects and errors, so core's output cannot disagree with the spec. This is core's single third-party runtime dependency (slim-dependencies section 5.5). It is the same choice the reference axi-sdk-js makes. A command that needs a different rendering for one result passes per-format renderers to `result()` (section 3.5).
- A command that declares its own `format` option conflicts with the global one. v12 makes that a startup error with a pointer to this RFC, rather than letting the two shadow each other.

### 3.5 No result channel (#639.5)

**Today.** A returned value reaches the caller of `parse()` and nothing else.

**Design: `run()` returns the answer and core prints it.**

```ts
run() {
	return { items }                                                  // → stdout, encoded in this.format
	// return result({ items }, { help: ['run `cli show <id>` for one'] })
	// return document(markdown)                                      // → stdout, verbatim
	// return empty('no plugins installed')                           // → stdout, exit 0
	// return undefined                                               // → nothing printed
}
```

- A plain non-`undefined` return is the result. It is encoded in `this.format` to stdout. `parse()` still resolves to the value, so programmatic callers and tests are unaffected.
- `result(value, { help, render })` attaches `help[N]:` lines inside the encoded output (omitted when empty, per upstream principle 9) and optional per-format renderers, for example `{ render: { text: (v) => table(v) } }`.
- `document(content)` writes `content` verbatim, for output that is already the answer (markdown, a diff, a file).
- `empty(message)` is a success with an explicit empty state. Empty is exit 0.
- These helpers replace `@clibuilder/axi`'s `createOutput`, `writeResult`, `writeDocument`, `writeError` and `Output`.
- **Core owns:** the envelope, `help[N]`, `result`, `document`, `empty`. **The `clibuilder/axi` subpath holds:** `truncateText` and `truncateList` (`count: N of M total`, `--full`), `orEmpty`, `homeHeader`, `collapseHome`. They build the *value* a command returns. The `fullOption` stays a CLI-level option that the command reads.
- A warning the agent must see goes in the result data. `ui.warn` is a diagnostic on stderr (section 3.10). The result has no reserved keys for messages.
- In `output: 'console'` mode returned values are not printed, as today.
- The risk is commands that already return values for programmatic use and now print them. A codemod flags every `return <expr>` in a `run()` for review; see section 5.

### 3.6 Exit codes stop at 0/1/2 (#639.6)

**Design: core keeps 0, 1 and 2, and leaves the rest to each CLI.**

- The repos disagree above 2 (cyber-asana and cyber-figma use 3 to 7 for auth, forbidden, not found and rate limit; cynapse uses 3 to 5 differently). A named set in core or in axi would make one group of CLIs wrong, and the numbers carry less than the stable `code` string already does.
- `exitCodes` stays `{ success: 0, error: 1, usage: 2 }`.
- `CliError.exitCode` accepts any integer from 1 to 255. `0` is rejected, since an error must not exit 0. A CLI that wants 3 to 7 sets them itself.
- The rule stated in the docs: the exit code says *success, failure, or usage error*; the `code` string says *which failure*. Scripts branch on the first, agents on the second.

### 3.7 Help is not agent-shaped (#639.7)

**Design: core owns `--help`, adds per-command examples and structured help.**

- `--help` is an answer on stdout. It follows `--format`: text help under `text`, and the structured model under `toon` and `json`.
- The structured model is the one the text help is rendered from (name, description, arguments, options with types, defaults and aliases, sub-commands, examples). No new data: `render/help.ts` already walks this structure, so structured help is the encoder reading it instead of the text renderer. It reads option types and constraints through the descriptor introspection form in slim-dependencies section 3.4, so text help can show them, for example `--port <int 1..65535>`.
- `Command.examples?: { command: string; description: string }[]`, rendered under the command's help. It is also what a usage error's `help[N]` can draw from.
- Text help is unchanged except for the examples section.
- A compact mode (`--help` on a group lists only names and one-line descriptions) is already how groups render; no flag is added.
- `showHelp` and `showVersion` are deprecated, and leave the `ui` object in a later major, after which it carries only diagnostics. In v12 they stay, so a command that shows its own help (cyber-sdd calls `ui.showHelp()` today) keeps working: called from `run()` in `axi` mode it gets the help on stdout, following the format, like `--help`, and `showVersion()` writes the version like `--version`. Anywhere else, and in `console` mode, they write the text help and the version on stdout as in v11. *(Decided in the v12 default-flip PR: removing them in the same major as the flip would break such commands with no answer-shaped replacement for a group's own help.)*
- **In the `clibuilder/axi` subpath:** the home view (`bin:`, `description`, collapse), because it is a CLI's decision about what its bare invocation shows.

### 3.8 No version fast path (#639.8)

**Today.** `parse()` awaits config loading and every plugin activation before it looks at `--version`. A broken config or a slow plugin makes `cli --version` fail or hang.

**Design: answer before anything loads.**

- If the only token after the binary is `--version` or `-v`, core prints the version to stdout and returns 0 without awaiting config loading, plugin loading or `use()` extensions.
- Anything else, including `cli <cmd> --version`, takes the normal path, because `-v` and `--version` may be a sub-command's own option, and answering it needs the command tree.
- Config loading starts lazily too: the work that `builder()` kicks off eagerly today moves behind the first `parse()`, so merely constructing the CLI does no I/O. This matters for tests and for `--version`.
- Version output is plain text in every format, so scripts that read it keep working.

### 3.9 EPIPE (#639.9)

**Design: core handles it, in the default process streams only.**

- The stdout driver installs an `error` handler: on `EPIPE` it stops writing and sets the exit code to 0 (a reader that closed early is not a failure). Any other stream error is rethrown.
- Writes after the first EPIPE are dropped, so a long result does not keep a loop alive.
- It lives in the same stdout driver as `cli({ streams })` (section 3.10), so custom streams are the embedder's responsibility.
- Matches upstream SDK 0.1.12.

### 3.10 Output modes and stream routing

This is the design that sections 3.1 to 3.7 route through. It replaces standard-log (slim-dependencies section 4).

- **Streams.** `cli({ streams: { stdout, stderr } })` takes any two writables, `process.stdout` and `process.stderr` by default. `testCommand` passes in-memory streams and keeps returning `messages`. It runs in the default `axi` mode, so `messages` includes the printed answer, and takes `{ output: 'console' }` as a fourth argument to test a `console` CLI *(decided in the v12 default-flip PR)*.
- **Answers and diagnostics.** An answer is something the caller asked for: the returned value (plain, `result`, `document` or `empty`), a thrown `CliError` rendered once, `help[N]` lines, `--help` and `--version`. A diagnostic is everything said along the way: every `ui.*` call (`info`, `warn`, `error`, `debug`). `trace` is a log level that `--debug-cli` raises, not a `ui` method.
- **`cli({ output })`** picks one of two presets. Both are permanent and first-class.

| | `output: 'axi'` (default) | `output: 'console'` |
|---|---|---|
| returned value | stdout, encoded | not printed |
| thrown `CliError` | stdout, encoded once | message and help on stderr |
| usage error | stdout, ranked and coded, exit 2 | prose plus full help on stderr, exit 2 |
| `--help`, `--version` | stdout | stdout |
| `ui.info`, `ui.debug` | stderr | stdout |
| `ui.warn`, `ui.error` | stderr | stderr |

`console` keeps today's mapping, which follows standard-log's console reporter: `info` and `debug` on stdout (`console.debug` is an alias of `console.log` in Node), `warn` and `error` on stderr. The difference between the two modes is the level-to-stream routing table above and the two usage-error renderers; everything else is shared.

- **Routing is internal in v12.** The level-to-stream map behind each preset is not a public option. A CLI picks a preset with `cli({ output })`.
- The levels still follow `--verbose`, `--silent` and `--debug-cli`, as today.

## 4. What moves, in one table

`@clibuilder/axi` is folded into core in v12. Its output, error, usage and format parts are built into core. Its value helpers move to the `clibuilder/axi` subpath of core (section 4.1).

| Concern | Built into core (`clibuilder@12`) | `clibuilder/axi` subpath |
|---|---|---|
| Error report shape and rendering (`ErrorReport`, `errorOutput`) | yes | no |
| Usage-error ranking and codes (`createUsageErrorHandler`, `describeUsageError`) | yes | no |
| `--format`, `this.format`, json, text, toon (`formatOption`, `parseFormat`, `renderText`) | yes | no |
| Result channel: `result`, `document`, `empty`, `help[N]` (replaces `createOutput`, `writeResult`, `writeError`, `writeDocument`, `Output`, `withHelp`, `helpLines`) | yes | no |
| Stream routing, `cli({ output, streams })` | yes | n/a |
| Truncation, counts, `--full` | no | yes |
| Output contract functions (`encode`, `errorOutput`, `printAnswer`, `formats`/`Format`, `CliError`/`isCliError`), re-exported only (#688) | yes | yes |
| Headless runner `runScript` (#688) | no | yes |
| `orEmpty`, home header, collapse | no | yes |
| Exit codes 0, 1, 2 | yes | no |
| Exit codes above 2 | no (each CLI's own) | none |
| Help examples, structured help | yes | n/a |
| Version fast path, EPIPE | yes | n/a |

The line: **if it changes what `parse()` does, it is built into core. If it is what a command or a standalone script imports, it is in the `clibuilder/axi` subpath.** The subpath is optional, and a CLI that does not import it gets conforming errors, usage errors and result output from core alone. The subpath is also usable without `cli()` (section 4.1, decision 5).

### 4.1 Decision: where `@clibuilder/axi`'s contents belong

Recorded from [#667](https://github.com/clibuilder/clibuilder/issues/667).

**Context.** `@clibuilder/axi` 0.2.0 holds about 600 lines in one package named after clibuilder. Checking which of its files import `clibuilder` shows a seam:

| Imports `clibuilder` | Does not |
|---|---|
| `usage.ts` (reads `cli.Command` and `cli.UsageError`) | `error.ts`, `help.ts`, `home.ts`, `text.ts` |
| `output.ts` (`createOutput.error` returns a `CliError`) | the writers and `encodeResult` in `output.ts` |
| `format.ts` and `truncate.ts` (`defineFormatOption`, `fullOption` use `z`) | `truncateText`, `truncateList`, `orEmpty`, `OutputFormat`, `parseFormat` |
| `index.ts` (re-exports `exitCodes`) | |

The conventions themselves are framework-free: the error shape, truncation, counts, the empty state, the home header, `help[N]` and the text renderer. Only the five spots in the left column couple to clibuilder. Because both sides ship in one package, a CLI that is not built on clibuilder cannot reuse the conventions without a clibuilder peer. axi-sdk-js has the same shape (section 9).

The conventions track an upstream spec that is still before 1.0, so they change more often than core. Core should own its output contract and not depend on a package that changes more often than it does.

**Decision.**

1. Core owns the AXI contract: error rendering, usage-error ranking, `--format`, the result channel, and the text and toon encoders (sections 3 and 4).
2. The value helpers (truncation, counts, `orEmpty`, home header and collapse) move to a `clibuilder/axi` subpath of core. The subpath can be tree-shaken, and a CLI that does not import it does not pay for it.
3. The framework-free modules in core import nothing from the framework. A lint or depcheck boundary rule enforces this, so a neutral package can later be extracted by moving files, not rewriting them. They live in `packages/clibuilder/src/axi/`, which imports only Node built-ins and its own files. A `noRestrictedImports` override in `biome.json` enforces this, and a spec repeats the check for `require()`, which the lint rule does not see. `fullOption` is declared with `t`, so it sits in the subpath entry (`src/axi.ts`) next to the re-exports of `result`, `document`, `empty` and `exitCodes`, not in the framework-free directory.
4. `@clibuilder/axi` is deprecated on npm when v12 ships with the subpath, with a message that points at it. Until then it is not deprecated, and current users keep using it. Its final release is 0.3.0, the deprecation release ([#687](https://github.com/clibuilder/clibuilder/pull/687)).
5. The subpath is usable without `cli()`. It exports the output contract functions (`encode`, `errorOutput`, `printAnswer`, `CliError`) and a headless runner, `runScript(command, { argv?, streams? })` ([#688](https://github.com/clibuilder/clibuilder/issues/688)). It takes the same `{ options, run }` object passed to `cli().command()`, so a command keeps one definition and two entries. The runner gives `run` a reduced `this` (`format` and `ui` on stderr, no `config`, no `keywords`), so a command that reads `this.config` is a type error when run headless. Items 1 to 3 of #688 are additive for 12.x.

**Boundary tiers.** The framework-free rule (decision 3) has two tiers.

- **Tier A**, `src/axi/`: Node built-ins and its own files only. Unchanged.
- **Tier B**: `render/{encode,answer,text}.ts`, `app/errors.ts` and `src/script/`. They may import tier A, `@toon-format/toon` and `args-minus`, and never cli, app, invocation or config. The same `require()` spec check covers both tiers.

**Decided before 12.0.0** (reversing either later would be a break):

- `encode` and `printAnswer` stay synchronous, with `@toon-format/toon` imported statically. Lazy toon is rejected: it would make them async right after they become public, and toon is on the default path anyway (#688).
- Config moves behind `.use(config())` in a `clibuilder/config` subpath of core, not a new package ([#692](https://github.com/clibuilder/clibuilder/issues/692)). This supersedes the earlier recommendation in #689 to keep config a `cli()` option. A CLI without the extension carries no loader, no find-up and no parsers. `jsonc-parser` is replaced by an internal stripper ([#693](https://github.com/clibuilder/clibuilder/issues/693), closes slim-dependencies Q4). The stripper has merged (#694); `.use(config())` is in flight and not yet merged.

**Not doing.**

- No separate neutral package now. About 150 lines are generic, and a package costs more in releases and docs than it saves. The four CLIs that hand-roll these pieces today do not depend on clibuilder. A neutral package is extracted only if one of them wants a shared helper. A skill script bundles what it imports and carries no install cost, so it is not the framework-free consumer that would trigger extraction.
- No dependency on, or wrapper around, axi-sdk-js. Core aligns the error keys and adds a conformance test (section 9).

**Consequences.**

- `@clibuilder/axi` has no v12 release; 0.3.0 is its final, deprecation release. Its users move to `clibuilder` and `clibuilder/axi` with the v12 migration (section 5, item 8).
- The boundary rule is added to the repo's lint or depcheck configuration before the subpath is created (done; the subpath was created in #680).
- The tier B boundary is added before the output functions are exported from the subpath.
- The headless runner has a bundle-size test (runner entry at most about 22 KB minified).
- An extracted neutral package, if one is ever needed, must never import clibuilder.
- Deprecating `@clibuilder/axi` on npm needs an explicit decision when v12 is published.

## 5. Breaking changes in v12

1. **Usage errors and errors print to stdout, exit codes unchanged.** Prose on stderr and the full help after a usage error are gone. *Migrate:* none needed for agents; for scripts that read stderr, `cli({ output: 'console' })`.
2. **`ui.*` is on stderr in `axi` mode.** `ui.info` no longer reaches stdout. *Migrate:* return the value instead, or use `output: 'console'`.
3. **A non-`undefined` return from `run()` is printed.** *Migrate:* return `undefined` when nothing should print, use `result(value, { render })` to control the printed form, or use `output: 'console'`. This is the most likely to surprise, so it ships with a codemod that flags every `return <expr>` in a `run()` for review.
4. **`CliError` message and help no longer go to stderr.** They are rendered once as a report on stdout.
5. **A global `--format` exists, default `toon`.** A command that declares its own `format` is a startup error. *Migrate:* delete the local declaration and read `this.format`.
6. **`showHelp` and `showVersion` are deprecated** (they leave `ui` in a later major, section 3.7). Usage errors, config-validation failures and a bare command group no longer print the full help.
7. **`UsageError` gains `code`;** `keyType` becomes the descriptor's `kind` string; `onUsageError` context gains `format`. Only the top-ranked usage error is reported, with a `help` list.
8. **`@clibuilder/axi` is folded into core.** Import its output, error, format and usage exports from `clibuilder`, and the value helpers from `clibuilder/axi` (section 4.1).
9. **zod is replaced by `t`** (slim-dependencies section 3). Conversion that reads files, resolves paths, calls the network or depends on other options moves into `run()` as a `CliError`.
10. **`builder()` no longer loads config on construction.** Observable only to tests that inspected the I/O.
11. Plus the rest of what slim-dependencies breaks (standard-log, `testCommand` export, plugins).

`cli({ output: 'console' })` restores items 1 to 4 and the full help after a usage error. It is a permanent mode, not a migration aid, and it is a flag, not a mode that detects agents.

## 6. Sequencing

Every step below is its own issue and PR. All but the last two land in v11 minors and are non-breaking: new behaviour is behind `cli({ output: 'axi' })` until the flip.

1. **Version fast path** (3.8). Independent, small. Fix for a real failure mode.
2. **Streams and the built-in UI** (3.10, slim-dependencies section 4). `cli({ streams })`, the routing table and both presets, with `output: 'console'` as the v11 default. EPIPE (3.9) lands in the same driver.
3. **`t` descriptors** (slim-dependencies section 7). The descriptor work lands in `args-minus` first: the builders and their constraints, `.check()`, `t.custom`, the introspection form and the vendored Standard Schema interface. clibuilder then re-exports `t` and moves its parser onto `args-minus`, alongside the zod path. `UsageError.keyType` gets its kind string here, and help reads the introspection form.
4. **Structured `CliError`** (3.1), rendered once on stdout under `output: 'axi'`.
5. **Global-option resolution before usage errors**, with `format` passed to `onUsageError` (3.2). Includes folding the #634 swap-in into it.
6. **`--format` global option and the toon, json and text encoders** (3.4), active under `output: 'axi'` or when `cli({ format })` is set. Adds `@toon-format/toon` as a dependency.
7. **Result channel** (3.5): printed returns, `result`, `document`, `empty`, under `output: 'axi'`.
8. **Built-in ranked usage errors** (3.3) and core-owned `--help` and `--version` (3.7), under `output: 'axi'`.
9. **Help examples and structured help** (3.7). Additive.
10. **Flip the defaults in v12**, together with slim-dependencies' v12 step: `output: 'axi'` becomes the default, zod and standard-log are removed, and the value helpers ship in the `clibuilder/axi` subpath (section 4.1).
11. **Codemod and migration guide**, written while 10 is in review, as one document for both RFCs.
12. **Headless runner and output exports** (4.1, decision 5, #688). Additive, lands in a 12.x minor: export the output functions from `clibuilder/axi`, add the tier B boundary, then `runScript` with its size test.

Steps 1 and 2 are independent of the rest and can ship first. Step 2 precedes 4 to 8, which all write through the routing table. Step 3 precedes 8, because usage errors read descriptor kinds. Steps 5 to 8 share the base-lookup change and should be reviewed in order.

## 7. Downstream impact

From the #639 survey and the slimming RFC's dependent list:

- **cyber-mux, cynapse, gherkin-cli** already render AXI output by hand; they delete code (their error shapes become core's) and need the `code` strings aligned.
- **cyber-asana, cyber-figma** keep their own exit codes 3 to 7 through `CliError.exitCode`; cynapse keeps its own meanings the same way.
- **repobuddy/buddy, agent-harness** return values from `run()` in places; the codemod flags those. Any CLI that prints with `ui.info` and is read by a script either returns the value or picks `output: 'console'`.
- **`@clibuilder/axi` in this repo** is the first consumer. Its output, error, format and usage modules move into core, and truncation, counts, `orEmpty` and the home helpers move to the `clibuilder/axi` subpath. The package is deprecated on npm when v12 ships (section 4.1).

## 8. Interaction with slim-dependencies

- **Streams.** The routing in section 3.10 is a table over `cli({ streams })`; EPIPE lives in the same driver. [slim-dependencies section 4](slim-dependencies.md#4-logging-standard-log-and-standard-log-color) describes the same two presets.
- **toon.** `@toon-format/toon` is core's single third-party runtime dependency (section 3.4). This resolves slim-dependencies Q7.
- **`ui.info`.** Slim-dependencies Q5 and this RFC's Q5 are the same question, resolved by section 3.10.
- **`t`.** zod is replaced by descriptors that live in `args-minus` and are re-exported by clibuilder. Usage errors and structured help read their introspection form, including the constraints an `invalid-value` error reports.
- **One major.** Both break the same release; the migration guide is a single document.

## 9. Relationship to axi-sdk-js

[axi-sdk-js](https://github.com/kunchenguid/axi/tree/main/packages/axi-sdk-js) is the reference SDK for the AXI conventions. It is a set of output helpers a CLI calls, with `@toon-format/toon` as its encoder. clibuilder is a parser and command framework, so the same conventions sit in a different place: inside `parse()`, on the returned value and the thrown error. clibuilder does not wrap axi-sdk-js or depend on it. It aligns on the wire instead: errors use the same `error`, `code` and `help` keys, and core carries a conformance test that compares its error output with the SDK's for the same report. The SDK's update check and session hooks may later become optional helpers outside core.

## 10. Open questions

Resolved on 2026-10-11:

1. ~~**Default format.** `toon` or `text` by default?~~ **Resolved:** `toon`; the CLI author overrides it with `cli({ format })` (section 3.4).
2. ~~**Non-`undefined` return is printed.** Or require an explicit `result()` wrapper first?~~ **Resolved:** a plain return is printed in `axi` mode; `result(value, { render })` controls the printed form (section 3.5).
3. ~~**toon in core.** A hand-rolled subset, or `@toon-format/toon`?~~ **Resolved:** `@toon-format/toon`, as core's single third-party runtime dependency (section 3.4).
4. ~~**Single-object and error output.** Plain `key: value` for those, TOON only for collections?~~ **Resolved:** the official encoder for everything (section 3.4).
5. ~~**`ui.info` routing.** Does `ui.info` move to stderr?~~ **Resolved:** in `axi` mode every `ui.*` call goes to stderr; in `console` mode `ui.info` stays on stdout (section 3.10). Shared with slim-dependencies Q5.
6. ~~**Exit codes 3 to 7.** Ship a named set in axi, or leave it to each CLI?~~ **Resolved:** no named set anywhere; `exitCode` is open from 1 to 255 (section 3.6).
7. ~~**`legacy` lifetime.** One major or permanent?~~ **Resolved:** renamed `console`, and permanent (section 3.10).
8. ~~**Version fast path scope.** Bare `--version` only, or also `cli <group> --version`?~~ **Resolved:** bare `--version` or `-v` only (section 3.8).
9. ~~**Bad `--format` value.** Default format or plain text?~~ **Resolved:** a usage error in the CLI's default format, exit 2, code `invalid-value` (section 3.2).
10. ~~**`-f` for `--format`.**~~ **Resolved:** not reserved (section 3.4).
11. ~~**Does `@clibuilder/axi` still need to be a separate package?**~~ **Resolved:** no. The output, error, usage and format parts are built into core. The value helpers move to a `clibuilder/axi` subpath, and a boundary rule keeps those modules free of framework imports. `@clibuilder/axi` is deprecated on npm only when v12 ships (sections 4 and 4.1).

Settled by later decisions on 2026-10-11:

12. ~~**Name of the `quiet()` opt-out.**~~ **Resolved:** there is no opt-out wrapper; `result(value, { render })` controls the printed form (section 3.5).
13. ~~**Descriptor introspection form.**~~ **Resolved:** a public, read-only union keyed on `kind` ([slim-dependencies section 3.4](slim-dependencies.md#34-design-c)). Its exact field names stay open (item 17).
14. ~~**Untested `t` typing.**~~ **Resolved:** the foreign-schema typing was tested on TS 6.0.3 and 7.0.2, and `.check()` uses an explicit input comparison ([slim-dependencies section 3.5](slim-dependencies.md#35-implementation-rules-for-t)).
15. ~~**Is `cli({ routing })` public in v12?**~~ **Resolved:** no, routing is internal in v12 (section 3.10).
16. ~~**Schema semantics.** May a schema change the option's type, and where does string coercion live?~~ **Resolved:** a schema in `.check()` only validates and its output is ignored; the descriptor or `t.custom` converts, and there is no coercion step ([slim-dependencies section 3.4](slim-dependencies.md#34-design-c)).

Still open, all in [slim-dependencies section 10](slim-dependencies.md#10-still-open):

17. **Exact introspection field names,** finalized in the implementation PR.
18. **A built-in `t.json(schema)` helper.**
19. **`t.custom` as an array element** after v12.
20. ~~**Async Standard Schema in `.check()`:** awaited or rejected.~~ **Resolved:** awaited; a function check may also return a promise ([slim-dependencies section 3.4](slim-dependencies.md#34-design-c)).
21. **Type-check cost on a CLI with many commands,** not yet measured.
22. ~~**Async `t.custom`.**~~ **Resolved:** a converter may return a promise, which is awaited ([slim-dependencies section 3.4](slim-dependencies.md#34-design-c)).
23. ~~**How a converter marks a usage failure,** proposed as a plain `Error`.~~ **Resolved:** a plain `Error`; see slim-dependencies decision 17.
24. **`ref()` and `next[N]{run,why}`.** Adds a wire key that the AXI spec and axi-sdk-js do not have, and depends on a build-time map from universal-plugin#177. Split out of #688 item 4 into its own issue, gated on the ACED eval (#688 item 5). Not in v12.
