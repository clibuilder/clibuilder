---
'@clibuilder/plugins': minor
---

Under clibuilder's `cli({ output: 'axi' })`, `plugins list` and `plugins search` return their report as the answer, which clibuilder prints once on stdout, instead of logging it: the names with a `help` line, prose under `--format text`, and an `empty` state naming the keywords. An unknown `--fields` value is a `CliError` with code `invalid-value` and exit code 2. In the default `console` output, and with a clibuilder before the result channel, the output and return values are unchanged.
