---
'clibuilder': minor
---

`CliError` is now a structured report. Besides `message`, `help` and `exitCode`, it carries a `code`, a stable kebab-case string that says which failure it is (`error` by default), and `details`, a flat record of extra fields. Pass them as options, `new CliError(message, { code, details })`, or pass the whole report, `new CliError({ message, code, details, help, exitCode })`. `exitCode` accepts any integer from 1 to 255, and `0` or any other value now throws a `RangeError`.

With `cli({ output: 'axi' })`, a `CliError` thrown from `run()` is rendered once on stdout as `error`, `code`, the `details` fields and `help`, and nothing is written to stderr for it. A debugging copy is a `debug` line under `--verbose`. The encoding is the new `cli({ format })` option: `'toon'` (the default, through `@toon-format/toon`), `'json'` or `'text'`. With the default `output: 'console'`, errors are reported as before.

`CliError.reported(exitCode)` is a `CliError` for a failure that was already reported: the CLI exits with `exitCode` and prints nothing for it.
