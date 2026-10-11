---
'@clibuilder/axi': minor
---

`@clibuilder/axi` is folded into `clibuilder` 12, and every export is now `@deprecated` with its replacement.

Breaking:

- The peer dependency is `clibuilder` `^12`. *Migrate:* upgrade `clibuilder` to 12.
- `fullOption` is re-exported from `clibuilder/axi` and declared with `t.boolean().optional()`, not zod. `fullOption.type.parse()` is gone. *Migrate:* use `fullOption` as a command option only.
- `formatOption` and `defineFormatOption()` declare their `type` with `t.enum(formats).optional()` instead of a zod enum. `formatOption.type.parse()` and `.safeParse()` are gone. *Migrate:* delete the local option and read `this.format`: clibuilder 12 declares a global `--format` and fails at startup on a command that declares its own.

`truncateText`, `truncateList`, `defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader`, `collapseHome` and `exitCodes` are re-exported from `clibuilder/axi` and work as before. *Migrate:* import them from `clibuilder/axi`.

The other exports keep working and map to built-in features:

- `createOutput`, `writeResult`, `encodeResult`, `writeDocument`, `withHelp`, `helpLines`: return the value, `result(value, { help, render })`, `document()` or `empty()` from `run()`.
- `output.error`, `writeError`, `encodeError`, `errorOutput`, `ErrorReport`: throw a `CliError` with `code`, `help` and `details`.
- `formatOption`, `defineFormatOption`, `parseFormat`, `formats`, `OutputFormat`, `renderText`: the global `--format`; read `this.format`, set the default with `cli({ format })`, and use `cli.Format` for the type.
- `createUsageErrorHandler`, `describeUsageError`: core ranks and codes usage errors itself; remove the `onUsageError` handler.

Until you migrate, `output` works with clibuilder 12's default `axi` output without printing twice: `output.result()` returns the value marked as already written, so clibuilder does not print it again, and `parse()` still resolves to the value. Its return type is now `OutputResult<T>`. `output.error()` returns a `CliError.reported()`, so the error is reported once, on stdout, and clibuilder does not log it again on stderr. In `output: 'console'` and with a custom writer, `output.result()` writes as before.
