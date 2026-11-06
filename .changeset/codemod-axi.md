---
"@clibuilder/codemod": minor
---

`clibuilder-codemod` is now built on clibuilder 12 and follows the AXI conventions.
It prints TOON on stdout by default: the counts, the flagged and review findings as `file:line:column` (30 at most, `--full` lists all), and the next steps that apply.
`--format json` prints the same answer as JSON, and `--format text` prints the prose report as before.
`--dry-run` still prints the unified diff on stdout and the report on stderr.
Usage errors are coded and printed on stdout with exit code 2, a file that cannot be read or parsed is an `unreadable-files` error with exit code 1, and `--help` and `--version` work as in any clibuilder 12 command.
A glob that matches no file is reported as `0 files matched`.
`runCodemod()` is unchanged.
