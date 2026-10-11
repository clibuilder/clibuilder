---
'clibuilder': minor
---

Resolve the global options before usage errors are reported, and tell `onUsageError` more.

The global options (`--help`, `--version`, `--verbose`, `--silent`, `--debug-cli`, `--show-config`) are read from the base command before the matched command's usage errors are looked at. The base command is the one source for them: a well-formed global flag is never an unknown option under a sub-command, and a malformed one, such as `--verbose=maybe`, is reported once as the invalid value it is. The output is unchanged.

The `onUsageError` context gains `format`, the format the CLI reports in (`'toon'` until `cli({ format })` exists), and `exitCode`, the code the CLI exits with when the handler returns none (`exitCodes.usage`). The new `cli.UsageErrorContext` and `cli.Format` types describe them.

Each `UsageError` handed to `onUsageError` gains `code`, a stable kebab-case string beside `type`: `unknown-option` for `invalid-key`, and the same as `type` for `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` and `extra-arguments`. In v11 it is not enumerable, so `JSON.stringify` and equality checks on an error are unchanged.
