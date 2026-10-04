---
spec-type: behavioral
concept: [agent-interface]
---

# Output

Governs `ts/format.ts`, `ts/output.ts` and `ts/text.ts` — the `--format`
option, encoding a result in the chosen format, and writing it to stdout.

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

## Rules

- `formatOption` declares `--format` once, so every command offers the same
  three values, wording, and default. An unknown value is a `clibuilder` usage
  error (exit code 2) before `run` is called; nothing falls back silently.
- `defineFormatOption` moves the default (and the wording with it) for a command
  whose natural answer is something else, such as a document.
- `parseFormat` rejects an unknown string for a format read from outside argv.
- `createOutput(args.format)` binds the parsed format once: `result()` writes and
  returns the value, so the command stays testable through its return; a
  renderer passed for the active format replaces the encoder and is written
  verbatim; `document()` writes verbatim whatever the format.
- Every write ends the stream on exactly one newline.
