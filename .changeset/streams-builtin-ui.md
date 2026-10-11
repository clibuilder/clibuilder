---
'clibuilder': minor
---

Add `cli({ streams })` and `cli({ output })`.

`streams` sends everything the CLI writes to the `stdout` and `stderr` you pass, `process.stdout` and `process.stderr` by default. `output` picks where `ui` messages go: `'console'` (the default) keeps `info` and `debug` on stdout and `warn` and `error` on stderr, and `'axi'` writes every `ui` message to stderr so stdout carries only answers. Help and version go to stdout in both.

With either option set, the CLI uses a built-in UI that colours errors and warnings only on a TTY and follows `NO_COLOR` and `FORCE_COLOR`. Without them, the output is unchanged.

When the reader of `process.stdout` closes early, as in `cli | head -1`, the CLI now drops the rest of its output and exits 0 instead of crashing on `EPIPE`.

`testCommand` captures through in-memory streams and returns `messages` as before.
