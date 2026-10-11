---
'@clibuilder/plugins': minor
---

`plugins list` and `plugins search` follow clibuilder 12's output:

- In the default `axi` output they return their report as the answer, which clibuilder prints once on stdout, instead of logging it: the names with a `help` line, prose under `--format text`, and an `empty` state naming the keywords. An unknown `--fields` value is a `CliError` with code `invalid-value` and exit code 2.
- They drop their own `--format` option and read clibuilder's global `--format` as `this.format`, which takes the same values and defaults to `toon`. The command line is unchanged.
- In `output: 'console'` they log the report in `this.format` and return the same values as in 0.1.
