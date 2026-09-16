---
"clibuilder": minor
---

Add the `onUsageError(errors, { command, ui })` option to `cli()`.
Use it to report usage errors (unknown option, missing or extra argument, invalid value) in your own format.
The handler gets the structured errors and the matched command, including commands that plugins add.
It chooses what to print and whether to show help.
The cli still exits `2` unless the handler returns another exit code.
