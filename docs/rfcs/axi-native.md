# RFC: make clibuilder AXI-native for the next major

- **Status:** Proposed. Design only; no code changes.
- **Target:** `clibuilder@12` (breaking), shipped with [slim-dependencies](slim-dependencies.md)
- **Issue:** [#639](https://github.com/clibuilder/clibuilder/issues/639)
- **Related:** [#636](https://github.com/clibuilder/clibuilder/pull/636) (`@clibuilder/axi` completion) and its [findings](../../packages/axi/docs/findings/README.md); #607, #608, #609, #614
- **Scope:** the nine friction points in #639, and what each one changes in core versus `@clibuilder/axi`. Not the dependency work, though section 8 checks the two plans against each other.

## 1. Summary

`@clibuilder/axi` 0.2 layers the AXI conventions on top of clibuilder. Six CLIs were surveyed and each rebuilds the same pieces, because clibuilder's defaults point the other way: errors and usage errors go to stderr as prose, there is no shared `--format`, and `run()` return values are not an output channel.

**Recommendation.**

- **Core owns the contract.** Anything that has to happen *inside* `parse()`, or that every CLI must agree on to be readable by an agent, moves into `clibuilder@12`: error rendering, usage-error ranking and rendering, the resolved `--format`, the result channel, the version fast path, EPIPE.
- **`@clibuilder/axi` keeps the vocabulary.** Truncation, `count: N of M total`, `orEmpty`, home header and collapse, TOON helpers, and the named codes above 2 stay in the package. They shape *what* a command says, and none of them needs to run inside `parse()`.
- **One major.** The defaults flip in `clibuilder@12`, together with the dependency slimming. A v11 minor adds everything additively first, so most of the work can be adopted and tested before the flip.
- **Opt-out, not opt-in.** `cli({ output: 'legacy' })` restores the v11 behaviour (prose usage errors on stderr, no result channel) for one major, so a CLI can upgrade first and migrate later.

| # | Friction point | Decision | Lives in |
|---|---|---|---|
| 1 | Errors reported twice | `CliError` carries the structured report; core renders it once | core |
| 2 | Usage errors ignore `--format` | Resolve global options before usage errors are reported | core |
| 3 | Usage errors are prose on stderr | Built-in ranked, coded error on stdout, exit 2 | core (ranking, rendering); axi (compat shim) |
| 4 | `--format` is not first-class | One global `--format`, resolved value on `this.format` | core (option, json, text, toon); axi (extra encoders) |
| 5 | No result channel | `run()` returns a `Result`; core encodes it | core (envelope, `help[N]`); axi (truncation, counts, empty, home) |
| 6 | Exit codes stop at 2 | Core keeps 0, 1, 2; named 3 to 7 stay in axi | axi |
| 7 | Help is not agent-shaped | `examples` field, structured `--help` under `--format` | core |
| 8 | No version fast path | Answer `--version` before config and plugins load | core |
| 9 | EPIPE not handled | Exit 0 quietly on a closed stdout | core |

## 2. How it works today

Read from `packages/clibuilder/ts/app/builder.ts` at `10bc61e`.

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

**Decision: core renders errors, once.**

- `CliError` becomes the structured report: `message`, `code` (stable kebab-case string), `details` (flat key/value), `help` (string or string[]), `exitCode`.
- Core encodes it in the resolved format on stdout (section 3.4) and writes **nothing** to stderr for it.
- An escape hatch for a command that already wrote its own report: `CliError.reported(exitCode)`, which sets the exit code and prints nothing. This is what `@clibuilder/axi`'s `output.error` returns in the v11 line, and it is the only change v11 needs for this point.
- The stderr echo is dropped from the default path. A debugging copy is available under `--verbose`, as a `debug` line.

**Moves to core:** the report shape, the encoding, the `reported` flag. **Stays in axi:** `ErrorReport` helpers that build reports from backend failures ("backend text must be translated, not forwarded" is a convention for the CLI author, not a framework feature).

### 3.2 Usage errors cannot honour `--format` (#639.2)

**Today.** `onUsageError(errors, { command, ui })` runs with no knowledge of the format, because `--format` is a per-CLI option that the matched command's lookup has not necessarily parsed yet, and the handler is built before the CLI runs.

**Decision: resolve the global options first, and pass them in.**

- Global options (`help`, `version`, `verbose`, `silent`, `debug-cli`, `show-config`, and the new `format`) are all read from the **base lookup** before the matched command's errors are looked at. The code already does this for the logging flags; `format` joins them.
- The handler context gains `format` and `exitCode`: `{ command, ui, format }`. Core uses the same resolved value for its default renderer.
- If `--format` itself has a bad value, core reports *that* error in the default format (`toon`) and says so. It must not loop.
- Because the base lookup is already the source of truth for #614, this is the same ordering fix, not a second mechanism. The #614 swap-in logic collapses into "base errors win for global keys".

### 3.3 Usage errors default to prose plus help on stderr (#639.3)

**Decision: the ranked, coded error on stdout is the default.**

- Core takes the ranking now in `@clibuilder/axi`'s `usage.ts`: unknown option, conflicting options, invalid value, expect single, missing argument, extra arguments. Only the top-ranked error is reported, because later ones are usually caused by it (cyber-mux #194).
- Output: `error`, `code` (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument`, `extra-arguments`), the offending key or name, the valid choices, and `help[N]` lines. Exit 2, stdout, in the resolved format.
- The full help is no longer printed. The error lists the valid options or arguments instead, which is what the agent needed from the help.
- `cli({ onUsageError })` stays, for CLIs that want their own rendering. `UsageError` gains the `code` strings above next to the existing `type`.
- `@clibuilder/axi`'s `createUsageErrorHandler` and `describeUsageError` become re-exports for one major, then are removed.

### 3.4 `--format` is not first-class (#639.4)

**Decision: one global `--format`, declared by core.**

- `--format <toon|json|text>` joins the base command, so it is accepted by every command and shown once in help. Alias `-f` is **not** reserved (it is commonly a command's own `--force` or `--file`).
- The resolved value is on `this.format` in `run()` and in the usage-error context.
- **Default `toon`.** This matches the existing builtin default and the EFF measurements, and it keeps agent output cheap. A CLI changes it with `cli({ format: 'text' })`.
- **No TTY or agent detection.** Universal-plugin ADR-0005 rejected it, and the survey found none. The format is the same on a terminal and a pipe, so output is reproducible.
- **Encoders.** Core ships `json` and `text`, plus a small `toon` encoder for what the result envelope needs (scalar fields, flat arrays, uniform tables). That is a few hundred lines, not the full `@toon-format/toon` (see Q3). `cli({ encoders })` lets axi, or any CLI, replace or add one.
- A command that declares its own `format` option conflicts with the global one. v12 makes that a startup error with a pointer to this RFC, rather than letting the two shadow each other.

### 3.5 No result channel (#639.5)

**Today.** A returned value reaches the caller of `parse()` and nothing else.

**Decision: `run()` returns a result and core prints it.**

```ts
run() {
	return result({ items }, { help: ['run `cli show <id>` for one'] })   // → stdout, encoded
	// return empty('no plugins installed')                               // → stdout, exit 0
	// return undefined                                                   // → nothing printed
}
```

- A non-`undefined` return is the result. It is encoded in `this.format` to stdout. `parse()` still resolves to the value, so programmatic callers and tests are unaffected.
- `result(value, { help })` adds the `help[N]:` lines inside the encoded output (not on stderr, and omitted when empty, per upstream principle 9).
- `empty(message)` is a success with an explicit empty state. Empty is exit 0.
- Core owns: the envelope, `help[N]`, and `empty`. **axi keeps:** `truncateText` and `truncateList` (`count: N of M total`, `--full`), `orEmpty`, `homeHeader`, `collapseHome`. They build the *value* a command returns. The `fullOption` stays a CLI-level option that the command reads.
- `ui.info` remains for prose a command wants to emit mid-run; it is not part of the result. Where it is routed is Q5.
- The risk is commands that already return values for programmatic use and now print them. The `legacy` output mode and a codemod flag (`return` → `return quiet(value)`) cover that; see section 5.

### 3.6 Exit codes stop at 0/1/2 (#639.6)

**Decision: core keeps 0, 1 and 2; the extended set stays in `@clibuilder/axi`.**

- The repos disagree above 2 (cyber-asana and cyber-figma use 3 to 7 for auth, forbidden, not found and rate limit; cynapse uses 3 to 5 differently). Standardising numbers in core would make one group of CLIs wrong, and the numbers carry less than the stable `code` string already does.
- Core: `CliError.exitCode` accepts any integer 1 to 255 (`0` is rejected, since an error must not exit 0), and `exitCodes` stays `{ success, error, usage }`.
- axi: exports `exitCodes.auth` (3), `forbidden` (4), `notFound` (5), `conflict` (6), `rateLimited` (7) as a **suggestion**, documented as optional. Adopting them is a CLI decision.
- The rule stated in the docs: the exit code says *which kind of failure*, the `code` string says *which failure*. Scripts branch on the first, agents on the second.

### 3.7 Help is not agent-shaped (#639.7)

**Decision: core adds per-command examples and structured help; the rest of help stays as is.**

- `Command.examples?: { command: string; description: string }[]`, rendered under the command's help. It is also what a usage error's `help[N]` can draw from.
- `--help --format json|toon` returns the same model the text help is rendered from (name, description, arguments, options with types, defaults and aliases, sub-commands, examples). No new data: `render/help.ts` already walks this structure, so structured help is the encoder reading it instead of the text renderer.
- Text help is unchanged except for the examples section.
- A compact mode (`--help` on a group lists only names and one-line descriptions) is already how groups render; no flag is added.
- **Stays in axi:** the home view (`bin:`, `description`, collapse), because it is a CLI's decision about what its bare invocation shows.

### 3.8 No version fast path (#639.8)

**Today.** `parse()` awaits config loading and every plugin activation before it looks at `--version`. A broken config or a slow plugin makes `cli --version` fail or hang.

**Decision: answer before anything loads.**

- If `argv` after the binary is exactly `--version` (or `-v`, only when `-v` is the sole token and no command has claimed it), print the version to stdout and return 0 without awaiting `pending`.
- Anything else, including `cli cmd --version`, takes the normal path, because `-v` and `--version` may be a sub-command's own option.
- Config loading starts lazily too: the work that `builder()` kicks off eagerly today moves behind the first `parse()`, so merely constructing the CLI does no I/O. This matters for tests and for `--version`.
- Version output is plain text, not through the result channel, so scripts that read it keep working.

### 3.9 EPIPE (#639.9)

**Decision: core handles it, in the default process streams only.**

- The stdout driver installs an `error` handler: on `EPIPE` it stops writing and sets the exit code to 0 (a reader that closed early is not a failure). Any other stream error is rethrown.
- Writes after the first EPIPE are dropped, so a long result does not keep a loop alive.
- It lands with `cli({ streams })` from the slimming RFC, so custom streams are the embedder's responsibility.
- Matches upstream SDK 0.1.12.

## 4. What moves, in one table

| Concern | Core (`clibuilder@12`) | `@clibuilder/axi` after |
|---|---|---|
| Error report shape and rendering | yes | `output.error` becomes a thin builder |
| Usage-error ranking and codes | yes | re-export, then remove |
| `--format`, `this.format`, json, text, toon encoders | yes | extra encoders, full `@toon-format/toon` if wanted |
| Result envelope, `help[N]`, `empty` | yes | `withHelp`, `helpLines` removed or re-exported |
| Truncation, counts, `--full` | no | stays |
| `orEmpty`, home header, collapse | no | stays |
| Exit codes 0, 1, 2 | yes | stays re-exported |
| Exit codes 3 to 7 | no | stays |
| Help examples, structured help | yes | stays out |
| Version fast path, EPIPE | yes | n/a |

The line: **if it changes what `parse()` does, it is core. If it changes what a command says, it is axi.** axi stays small and optional, and a CLI that wants no truncation helpers still gets conforming errors, usage errors and result output from core.

## 5. Breaking changes in v12

1. **Usage errors and errors print to stdout, exit codes unchanged.** Prose on stderr and the full help after a usage error are gone. *Migrate:* none needed for agents; for scripts that read stderr, `cli({ output: 'legacy' })`.
2. **A global `--format` exists.** A command that declares its own `format` is a startup error. *Migrate:* delete the local declaration and read `this.format`.
3. **A non-`undefined` return from `run()` is printed.** *Migrate:* return `undefined` and use `ui.info`, or wrap with `quiet(value)`. This is the most likely to surprise, so it ships with a codemod that flags every `return <expr>` in a `run()` for review.
4. **`CliError` message and help no longer go to stderr** (they are rendered as a report on stdout).
5. **`UsageError` gains `code`;** `onUsageError` context gains `format`.
6. **`builder()` no longer loads config on construction.** Observable only to tests that inspected the I/O.
7. Plus whatever slim-dependencies already breaks (zod, `testCommand`, standard-log).

`cli({ output: 'legacy' })` restores items 1, 3 and 4 and is removed in v13. It is a flag, not a mode that detects agents.

## 6. Sequencing

Every step below is its own issue and PR, and each is non-breaking until the final flip. All but the last land in v11 minors.

1. **Version fast path** (3.8). Independent, small. Fix for a real failure mode; no dependency on anything.
2. **`CliError.reported` and the structured `CliError`** (3.1). axi switches `output.error` to it, which removes the double echo with no breaking change.
3. **Global-option resolution before usage errors**, with `format` passed to `onUsageError` (3.2). Includes folding the #634 swap-in into it. Adds `format` as an *optional* global option, default-off in v11.
4. **`--format` global option and encoders** (3.4), gated behind `cli({ format })` in v11.
5. **Result channel** (3.5), gated behind `cli({ result: true })` in v11.
6. **Built-in ranked usage errors** (3.3), gated behind `cli({ output: 'axi' })` in v11. axi's handler is re-pointed at it.
7. **Help examples and structured help** (3.7). Additive.
8. **EPIPE** (3.9). Lands with `cli({ streams })` from slim-dependencies.
9. **Flip the defaults in v12:** `output: 'axi'` becomes the default, `legacy` is the opt-out, the gates from 4 to 6 are removed, `@clibuilder/axi` releases with peer `^12` in the same train.
10. **Codemod and migration guide**, written while 9 is in review.

Step 1 and 2 are independent of the rest and can ship first. Steps 3 to 6 share the base-lookup change and should be reviewed in order. Step 8 is blocked on slim-dependencies' `streams` work.

## 7. Downstream impact

From the #639 survey and the slimming RFC's dependent list:

- **cyber-mux, cynapse, gherkin-cli** already render AXI output by hand; they delete code (their error shapes become core's) and need the `code` strings aligned.
- **cyber-asana, cyber-figma** keep their own exit codes 3 to 7; they only need `exitCode` to remain open, which it does.
- **repobuddy/buddy, agent-harness** return values from `run()` in places; the codemod flags those.
- **`@clibuilder/axi` in this repo** is the first consumer and releases in lockstep.

## 8. Interaction with slim-dependencies

- **Streams.** The stdout/stderr routing in 3.1 to 3.5 is a table over `cli({ streams })`; EPIPE lives in the same driver. The two RFCs should agree on the `Streams` type before either is implemented.
- **toon.** Slim-dependencies Q7 asks whether `@toon-format/toon` becomes a core dependency. This RFC's answer is no: core hand-rolls the small subset (section 3.4) so the zero-dependency goal holds, and the full encoder is available from axi.
- **`ui.info`.** Slim-dependencies Q5 and this RFC's Q5 are the same question.
- **One major.** Both break the same release; the migration guide should be a single document.

## 9. Open questions for the maintainer

1. **Default format.** `toon` is the proposal. Is that acceptable for a CLI whose users are mostly people, given `text` is one flag away? The alternative is `text` by default and `toon` opt-in, which reduces the surprise and loses the agent-by-default point of #639.
2. **Non-`undefined` return is printed.** This is the most breaking of the defaults. Should the first v12 instead require an explicit `result()` wrapper, and print only that, with plain returns left alone for one more major?
3. **toon in core.** A hand-rolled subset, or take `@toon-format/toon` as the single core dependency? The former is smaller; the latter cannot disagree with the spec.
4. **Single-object and error output.** The EFF research measured TOON as 12 to 20 percent more costly than plain `key: value` for single objects and errors, and the encoder quotes some values (`error: "--title is required"`). Should core use plain `key: value` for those and TOON only for collections?
5. **`ui.info` routing.** With a result channel owning stdout, does `ui.info` move to stderr? It matches the convention "stdout is what the agent acts on", but it changes today's behaviour for every CLI that prints with `ui.info`. Shared with slim-dependencies Q5.
6. **Exit codes 3 to 7.** Ship the named set in axi as proposed, or leave it as documentation and let each CLI choose, given cynapse's differing meanings?
7. **`legacy` lifetime.** One major, as proposed, or permanent? A permanent mode keeps scripted consumers stable but means maintaining two renderers.
8. **Version fast path scope.** Only the bare `--version`/`-v`, or also `cli <group> --version`? The latter needs the command tree and so plugin discovery in some cases.
9. **Bad `--format` value.** Report it in the default format (proposed) or in plain text?
10. **`-f` for `--format`.** Left unreserved here. Is a short alias worth the collision risk?
11. **What does `@clibuilder/axi` still need to be a separate package?** Once core owns errors, usage errors, formats and results, the package is truncation, counts, empty states and home views. Is a separate package still the right shape, or should those move into core under `clibuilder/axi`?
