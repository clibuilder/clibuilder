---
'@clibuilder/axi': patch
---

`output.error()` returns a `CliError.reported()` when the installed `clibuilder` has it, so the error is reported once, on stdout, instead of `clibuilder` logging its message a second time on stderr. With an older `clibuilder` it returns a plain `CliError` as before.
