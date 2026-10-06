---
spec-type: behavioral
concept: [agent-interface]
---

# Output

Governs `ts/format.ts`, `ts/output.ts`, `ts/text.ts`, `ts/help.ts`,
`ts/error.ts`, `ts/usage.ts`, `ts/truncate.ts` and `ts/home.ts` — the
`--format` option, encoding a result in the chosen format, writing it to stdout,
and the parts of an answer an agent acts on: errors, next steps, counts, empty
states, truncation, and the home header.

## What

A command keeps its result as a plain object and hands it to one boundary that
encodes and writes it. The reader picks the encoding with `--format`:

- `toon` — the default, because an agent-facing command is read by an agent far
  more often than by a person, and TOON is the cheaper read for one.
- `json` — compact, one line, for a pipe into `jq`.
- `text` — for a person: scalars as `key: value`, a list of records as an
  aligned table, a list of values as bullets, an empty list as `(none)`.

A **document** — a Markdown body an agent is about to follow — is the answer
itself, not a value to encode, so it is written verbatim. Run through TOON or
the text renderer it would come back as one escaped line.

Everything the agent acts on goes to **stdout**: the result, an error, the next
steps, an empty state. stderr is for diagnostics only. An agent that sees empty
stdout and a non-zero exit has nothing to recover with.

There is no TTY or agent detection: the format is always the one asked for, so
the same invocation gives the same output wherever it runs.

## Rules

### Format

- `formatOption` declares `--format` once, so every command offers the same
  three values, wording, and default. An unknown value is a `clibuilder` usage
  error (exit code 2) before `run` is called; nothing falls back silently.
- `defineFormatOption` moves the default (and the wording with it) for a command
  whose natural answer is something else, such as a document.
- `parseFormat` rejects an unknown string for a format read from outside argv.

### Results

- `createOutput(args.format)` binds the parsed format once: `result()` writes and
  returns the value, so the command stays testable through its return; a
  renderer passed for the active format replaces the encoder and is written
  verbatim; `document()` writes verbatim whatever the format.
- Every write ends the stream on exactly one newline.

### Next steps

- `result(value, { help })` writes the next-step suggestions after the result
  under `help` — `help[N]:` in TOON, an array in JSON, bullets in text. The
  returned value does not carry them.
- No suggestions, no key: a self-contained answer carries no hint.
- After a renderer's output, the suggestions follow in the same format.

### Errors

- An error is `error` (the message), `code`, any `details`, then `help` — flat,
  the same keys in every format.
- `code` is a stable kebab-case string that tells this failure apart from the
  others, such as `not-found`.
- `output.error(report)` writes the error on stdout and returns a `CliError`
  carrying its exit code — 1 unless the report says otherwise — for the command
  to throw. clibuilder then logs the message on stderr as a diagnostic.
- `writeError` writes an error outside a command and returns its exit code.

### Usage errors

- `createUsageErrorHandler()` is a `clibuilder` `onUsageError`: it writes one
  error on stdout with exit code 2, instead of messages and the full help on
  stderr.
- An unknown option is coded `unknown-option` and lists the command's valid
  options, `(--help always allowed)`; a missing or unexpected argument lists the
  arguments the command takes.
- Several errors are reported as one. An unknown option leads, then a conflict,
  then an invalid value, then a missing or extra argument — a mistyped option
  usually explains the rest.
- It writes in the format it is built with, `toon` by default: usage errors are
  found before `--format` is parsed.

### Truncation, counts, and empty states

- `fullOption` declares `--full`, the escape hatch from truncation.
- `truncateText` keeps `limit` characters (500 by default) and appends
  `... (truncated, N chars total)` on its own line; `full` keeps everything.
  It reports `truncated`, so the command can suggest the `--full` call.
- `truncateList` keeps the first `limit` items and counts them all:
  `count: N of M total`. The TOON `[N]` header counts the rows shown, never the
  total.
- JSON is for pipes and is not truncated: pass `full` when the format is `json`.
- `orEmpty(items, message)` says the zero — `tasks: 0 open tasks found` —
  instead of an empty list.

### Home view

- `homeHeader({ description })` gives `bin` (the running script, home collapsed
  to `~`) and `description`, to spread in front of the live content a bare
  invocation shows.
- `collapseHome` only collapses on a path boundary: `/home/mel` is not under
  `/home/me`.
