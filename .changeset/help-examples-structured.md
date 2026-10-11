---
'clibuilder': minor
---

A command may declare `examples: { command, description }[]`. They are shown in an `Examples` section at the end of the command's text help, each description above its command line, and a usage error handler reads them from `context.command.examples`. A command that declares none shows the same text help as before.

The structured help that `--help` answers under `--format toon` and `--format json` holds `name`, `usage`, `description`, `aliases`, `commands` (name, aliases and the first line of each description), `arguments` and `options` (type, `min`, `max`, `pattern` or allowed `values` of a `t` declaration, default, `required`, description, conflicts), `config`, `examples`, and the global options once under `globalOptions`.
