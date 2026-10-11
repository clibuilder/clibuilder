---
'clibuilder': minor
---

Add the global `--format <toon|json|text>` option.

It is active under `cli({ output: 'axi' })` or when `cli({ format })` is set. Every command then accepts it, help lists it once with the global options, and there is no `-f` alias. `run()` reads the resolved value as `this.format`: the caller's `--format`, else the `cli({ format })` value, `toon` by default. The `onUsageError` context's `format` carries the same value, and under `output: 'axi'` a `CliError` is rendered in it.

A bad `--format` value, such as `yaml`, is a usage error: exit code 2, code `invalid-value`, naming the option, the value and the allowed formats (`allowed: ['toon', 'json', 'text']`). It is reported in the CLI's default format, so it cannot loop.

While the global option is active, a command that declares its own `format` option fails the CLI at startup. Delete the local declaration and read `this.format` instead. This includes `formatOption` and `defineFormatOption()` from `@clibuilder/axi`. The built-in `plugins list` and `plugins search` give way to the global option and read `this.format`.

In the default `output: 'console'` with no `cli({ format })`, nothing changes: there is no global `--format`, and a command may declare its own. `this.format` is `'toon'` there.
