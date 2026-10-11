---
'clibuilder': minor
---

`clibuilder/axi` now works without `cli()`. It exports the output contract (`encode`, `errorOutput`, `printAnswer`, `formats` and the `Format` type) next to `CliError` and `isCliError`, and adds `runScript(command, { argv?, streams? })`. `runScript` takes the same `{ options, run }` object you pass to `cli().command()`, parses `--format` and the options, prints what `run()` returns, and resolves to the exit code. `this` in `run()` is `{ format, ui }` with `ui` on stderr, so a command that reads `this.config` is a type error. A thrown `CliError` is reported on stdout with its exit code, and a bad invocation is reported with code `usage` and exit 2.

`encode` and `printAnswer` are synchronous, and `@toon-format/toon` stays a static import.
