---
'clibuilder': major
---

Remove standard-log and standard-log-color. Every CLI now writes through a built-in UI over the new `cli({ streams })` option, which takes the `stdout` and `stderr` to write to, `process.stdout` and `process.stderr` by default. `--verbose`, `--silent` and `--debug-cli` work as before, and `testCommand()` still returns `messages`, one line per message.

With `output: 'console'`, `info` and `debug` still go to stdout and `warn` and `error` to stderr. Two things change from 11.5.0 in every output:

- **Colour only on a terminal.** `error` is red and `warn` is yellow only on a stream that is a TTY, following `NO_COLOR` and `FORCE_COLOR`. In 11.5.0 standard-log-color wrapped clibuilder's own `error` and `warn` text in colour codes even when stderr was a pipe or a file. Migration: if a script or test matched those escape codes, match the plain text.
- **No `clibuilder` prefix.** clibuilder's own messages, such as the ones `--debug-cli` shows, no longer start with `clibuilder`. Migration: match the message without the prefix.

When the reader of stdout closes early, as in `cli | head -1`, the CLI now drops the rest of its output and exits 0 instead of crashing on `EPIPE`.

Also removed from `dependencies`: `pad-right`, `wordwrap`, `tmp` and `tslib`. Help text is unchanged.
