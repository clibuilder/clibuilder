---
'clibuilder': major
---

Remove standard-log and standard-log-color. Every CLI now writes through the built-in UI over `cli({ streams })`, which defaults to `process.stdout` and `process.stderr`. `--verbose`, `--silent` and `--debug-cli` work as before, and `testCommand()` still returns `messages`, one line per message.

With `output: 'console'`, `info` and `debug` still go to stdout and `warn` and `error` to stderr. Two things change from 11.5.0:

- **Colour only on a terminal.** `error` is red and `warn` is yellow only on a stream that is a TTY, following `NO_COLOR` and `FORCE_COLOR`. In 11.5.0 standard-log-color wrapped clibuilder's own `error` and `warn` text in colour codes even when stderr was a pipe or a file. Migration: if a script or test matched those escape codes, match the plain text.
- **No `clibuilder` prefix.** clibuilder's own messages, such as the ones `--debug-cli` shows, no longer start with `clibuilder`. Migration: match the message without the prefix.

Also removed from `dependencies`: `pad-right`, `wordwrap`, `tmp` and `tslib`. Help text is unchanged. A clean install of `clibuilder` drops from 42 packages to 30.
