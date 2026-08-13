---
'clibuilder': minor
---

Report usage errors and exit non-zero.

A clibuilder cli could not fail. `lookupCommand` already built a typed list of everything wrong with
an invocation — unknown option, missing argument, extra arguments, a value of the wrong type — and
`builder` threw it away and printed the help message with an exit code of `0`. A command that knew
it had failed had no way to say so either.

- Usage errors are now reported by name (`unknown option --bogus`, `missing required argument
  <target>`) ahead of the help message, and the cli exits `2`.
- A config that fails its schema exits `1`.
- A command fails by throwing the new `CliError`, which carries an `exitCode` and optional `help`
  lines. `parse()` still resolves rather than rejecting, so the failure is reported instead of
  surfacing as an unhandled rejection.
- New exports: `CliError`, `exitCodes` (`success`/`error`/`usage` — 0/1/2), and `isCliError()`.
- `testCommand()` returns the `exitCode` alongside `result` and `messages`, so a test can assert a
  failure without ending the test run.
- `--help` and `--version` are accepted by every command, including sub-commands that declare no
  options of their own, and both still exit `0`.

The exit code is recorded on `process.exitCode` rather than applied with `process.exit()`, so
pending stdout writes are not truncated.

**This changes the behavior of every cli built with clibuilder**: an invocation with a typo used to
exit `0` and now exits `2`. The TypeScript surface is additive, which is why this is a minor rather
than a major, but a caller downstream of your cli that ignored the exit code will now see it fail.
