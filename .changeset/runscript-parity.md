---
'clibuilder': minor
---

`runScript()` accepts positional `arguments` and `conflicts`, and reports a bad invocation as `cli({ output: 'axi' })` does:
the top-ranked usage error alone, with its code (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`), `details` and `help`, and exit 2.
It shares `cli()`'s argument lookup instead of reporting code `usage` (#706).
A test runs one command through `cli().command()` and `runScript()` and checks that the answers, `CliError` reports and usage errors match.
