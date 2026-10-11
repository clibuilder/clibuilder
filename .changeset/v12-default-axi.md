---
'clibuilder': major
---

Make `cli({ output: 'axi' })` the default. `cli({ output: 'console' })` is the permanent opt-out, with the 11.x output.

Coming from 11.5.0, a CLI that does not set `output` changes like this:

- **A value `run()` returns is printed** on stdout, encoded in `this.format` (`toon` by default). `parse()` still resolves to it. Migration: return `undefined` when nothing should print, wrap the value in `result()`, `document()` or `empty()` to control the printed form, or set `output: 'console'`. `npx @clibuilder/codemod src` lists every `return <expr>` in a `run()` for review.
- **Every `ui` call is a diagnostic on stderr**, `ui.info` and `ui.debug` included. Migration: return the answer instead of logging it, or set `output: 'console'`.
- **A thrown `CliError` is reported once on stdout**, encoded as `error`, `code`, the `details` fields and `help`, and nothing is written to stderr for it.
- **A usage error is the top-ranked one, coded, on stdout**, with exit code 2 and no full help after it. The same goes for a config that fails validation (exit code 1) and a command group invoked without a sub-command (exit code 2).
- **`--help` is an answer on stdout that follows `--format`**: the structured help under `toon` and `json`, the text help under `text`. `--version` is plain text on stdout.
- **The global `--format <toon|json|text>` is declared in every CLI**, in both output modes. Help lists it with the global options, `this.format` is always resolved, and a command that declares its own `format` option fails the CLI at startup. Migration: delete the local option and read `this.format`.
- **`this.output` is `'axi'` by default.**
- **`testCommand` follows the default.** Its `messages` include the printed answer. It takes a fourth argument, `{ output }`, to test a CLI in `output: 'console'`: `testCommand(cmd, 'cmd', undefined, { output: 'console' })`.

`cli({ output: 'console' })` keeps the 11.5.0 output byte for byte, except that the help lists the global `--format`. A spec runs the same invocations against 11.5.0 and against 12 to hold it to that.

`ui.showHelp()` and `ui.showVersion()` stay on `ui` in 12 and stay deprecated. Called from `run()` in `axi` output they answer like `--help` and `--version`, in `this.format`. Anywhere else, and in `console` output, they write the text help and the version on stdout, as in 11. They are removed in a later major.
