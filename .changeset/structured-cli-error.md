---
'clibuilder': minor
---

`CliError` is now a structured report. Besides `message`, `help` and `exitCode`, it carries a `code`, a stable kebab-case string that says which failure it is (`error` by default), and `details`, a flat record of extra fields. Pass them as options, `new CliError(message, { code, details })`, or pass the whole report, `new CliError({ message, code, details, help, exitCode })`. `exitCode` accepts any integer from 1 to 255, and `0` or any other value now throws a `RangeError`.

In the default `axi` output, a `CliError` thrown from `run()` is reported on stdout with these fields, in `this.format`, and a debugging copy is a `debug` line under `--verbose`. The new `cli({ format })` option sets the default format: `'toon'` (the default, through `@toon-format/toon`), `'json'` or `'text'`. In `output: 'console'`, errors are reported as in 11.5.0.

`CliError.reported(exitCode)` is a `CliError` for a failure that was already reported: the CLI exits with `exitCode` and prints nothing for it.
