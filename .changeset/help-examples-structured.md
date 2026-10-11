---
'clibuilder': minor
---

A command may declare `examples: { command, description }[]`. They are shown in an `Examples` section at the end of the command's text help, each description above its command line, and a usage error handler reads them from `context.command.examples`. A command that declares none shows the same help as before.

Under `cli({ output: 'axi' })` the framework owns `--help` and `--version` as answers on stdout, whatever the display level:

- `--help` follows `--format`. `text` is the text help, unchanged. `toon` and `json` encode the structured help the text help is rendered from: `name`, `usage`, `description`, `aliases`, `commands` (name, aliases and the first line of each description), `arguments` and `options` (type, `min`, `max`, `pattern` or allowed `values` of a `t` declaration, default, `required`, description, conflicts), `config`, `examples`, and the global options once under `globalOptions`.
- `--version` is plain text in every format, alone or after a command.
- `ui.showHelp()` called from `run()` writes the help like `--help`, in `this.format`, and `ui.showVersion()` writes the plain version.

`ui.showHelp()` and `ui.showVersion()` are `@deprecated`: they leave `ui` in v12. A command that answers with help or a version returns it instead, with `document()` or `result()`.

In the default `console` output, `--help`, `--version`, `ui.showHelp()` and `ui.showVersion()` are unchanged.
