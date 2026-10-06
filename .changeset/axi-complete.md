---
'@clibuilder/axi': minor
---

Complete the AXI output conventions, from what was learned building agent-facing output by hand across the `cyberuni` repos (see `packages/axi/docs/findings`):

- Errors on stdout: `output.error(report)` writes `error`, `code`, details and `help` in the caller's format and returns a `CliError` to throw; `writeError`, `encodeError`, `errorOutput` and `ErrorReport` for use outside a command.
- Usage errors: `createUsageErrorHandler()` plugs into `clibuilder`'s `onUsageError` and reports an unknown option, a missing argument or a bad value as one structured error with exit code 2, listing what is valid. `describeUsageError()` codes a single one.
- Next steps: `output.result(value, { help })` writes `help[N]:` suggestions after the result; `withHelp` and `helpLines`.
- Truncation and counts: `fullOption` (`--full`), `truncateText` (`... (truncated, N chars total)`), and `truncateList` (`count: N of M total`).
- Empty states: `orEmpty(items, message)` says the zero instead of printing an empty list.
- Home view: `homeHeader({ description })` and `collapseHome(path)`.

The `clibuilder` peer dependency is now `^11.2.0`, the release that added `onUsageError`.
