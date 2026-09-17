---
"clibuilder": minor
---

Add `onUsageError(errors, { command, ui })` to report usage errors in your own format.
Usage errors are an unknown option, a missing or extra argument, and an invalid value.

Declare it on `cli()` options for the whole cli, or on a command for that command and its sub-commands.
This includes commands that plugins add.
clibuilder calls the matched command's handler, else the nearest enclosing command's, else the `cli()` one.
The handler gets the structured errors and the matched command, and chooses what to print and whether to show help.
The cli still exits `2` unless the handler returns another exit code.
