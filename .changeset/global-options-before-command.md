---
'clibuilder': minor
---

Accept the global options before the command.

`--help`, `--version`, `--verbose`, `--silent`, `--debug-cli`, `--show-config` and the global `--format` may come before the command, after it, or between a group and its sub-command: `app --verbose deploy`, `app --format json plugins list` and `app plugins --format json list` run the same command as `app deploy --verbose` and `app plugins list --format json`. Before, a global option before the command took the command name as its value, so these were usage errors.

A global option that takes a value, such as `--format json`, takes only that value. Its arity comes from the base command, the same source the global options are read from, so the value is never read as a command name.

A command's own options still go after the command: `app --force deploy` stays a usage error that names `--force` as unknown, and words after `--` never name a command.

One invocation that worked before changes: when the default command takes an argument, `app --verbose deploy` used to pass `deploy` to it; it now runs the `deploy` command, as `app deploy` does.
