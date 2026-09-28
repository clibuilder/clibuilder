---
'clibuilder': minor
---

`parse()` now resolves to the exit code it records when the cli fails: an unknown option or command, a group invoked without a sub command, a config that fails validation, or a thrown `CliError`. It used to resolve to `undefined` there, so a caller had to read `process.exitCode` to learn the outcome. The code is still recorded on the process as before.
