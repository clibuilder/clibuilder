---
title: UI
description: this.ui — how a command talks to the user, and how the display level is controlled.
---

Every command's `run()` gets a `UI` on `this.ui`. Use it instead of `console.log`: it respects the
display level the user asked for, and [`testCommand()`](/clibuilder/api/test-command/) captures it
in `messages`.

The `ui` is for diagnostics: what a command says along the way. The answer, what the caller asked
for, is what `run()` returns (see [The result channel](/clibuilder/api/cli/#the-result-channel)).

```ts
type UI = {
  displayLevel: DisplayLevel
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  debug(...args: any[]): void
  /** @deprecated */
  showHelp(): void
  /** @deprecated */
  showVersion(): void
}
```

## Methods

| Method | Shown at level | Use for |
| --- | --- | --- |
| `error(...)` | `info` and above | Something failed |
| `warn(...)` | `info` and above | Something is off but survivable |
| `info(...)` | `info` and above | Ordinary progress messages |
| `debug(...)` | `debug` and above | Diagnostics the user asked for with `--verbose` |
| `showHelp()` | — | Deprecated. Print the current command's generated help message |
| `showVersion()` | — | Deprecated. Print the CLI's version |

All four logging methods take any number of arguments and join them, like `console.log`.

In `clibuilder` 12 (unreleased) all of them go to stderr, which leaves stdout for answers. With
`cli({ output: 'console' })`, and in 11.5.0, `info` and `debug` go to stdout, and `warn` and `error`
go to stderr. See [Streams and output](/clibuilder/api/cli/#streams-and-output).

```ts
run() {
  this.ui.debug('resolved config from', this.cwd)
  this.ui.info('done')
}
```

## `DisplayLevel`

```ts
type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'
```

The level starts at `info` and is set by the [built-in
options](/clibuilder/guides/arguments-and-options/#built-in-options):

| Flag | Level | Effect |
| --- | --- | --- |
| *(none)* | `info` | `error`, `warn`, `info` |
| `--verbose`, `-V` | `debug` | ...plus `debug` |
| `--debug-cli` | `trace` | ...plus clibuilder's own internal messages |
| `--silent` | `none` | Nothing |

A command can also read or set `this.ui.displayLevel` directly, though letting the user's flags decide
is usually the better behavior.

## `showHelp()`

:::caution[Deprecated, Unreleased]
`showHelp()` and `showVersion()` are deprecated in `clibuilder` 12. They stay on `ui` in 12, so a
command that shows its own help keeps working, and they are removed in a later major. The CLI owns
`--help` and `--version`. To answer with help or a version from `run()`, return it:
`document(text)` prints text verbatim, and `result(value)` encodes a value in `this.format` (see
[The result channel](/clibuilder/api/cli/#the-result-channel)).

With `output: 'axi'`, the default, `showHelp()` from `run()` writes the help on stdout in
`this.format`, like `--help`, and `showVersion()` writes the plain version on stdout (see
[`--help` and `--version` with `output: 'axi'`](/clibuilder/api/cli/#--help-and---version-with-output-axi)).
Called anywhere else, such as from an `onUsageError` handler, and with `output: 'console'`, they
write the text help and the version on stdout, as below.
:::

The help message is generated from the descriptions on the CLI, the resolved command, its arguments,
and its options. You never write it by hand. It is what `--help --format text` prints. With
`output: 'console'` it is also printed when a command has no `run`, when `--help` is passed, or when
parsing fails.

```
Usage: app <arguments> [options]

Arguments:
  <values: number...>     values to add

Options:
  [-h|--help]                  Print help message
  [-v|--version]               Print the CLI version
  [-V|--verbose]               Turn on verbose logging
  [--silent]                   Turn off logging
  [--debug-cli]                Display clibuilder debug messages
  [--format <toon|json|text>]  Output format: 'toon' for agents, 'json' to pipe, 'text' for humans (default 'toon')
```

`clibuilder` 11.5.0 has no `--format` line.

Arguments and options are written in the same notation:

| Notation | Meaning |
| --- | --- |
| `<name>` | Required |
| `[name]` | Optional, declared with `.optional()` |
| `name: string`, `<int 1..65535>` | The declared type and its constraint, when there is one |
| `...` | Variadic or repeatable, declared with `t.array(...)` |

A command that declares [`examples`](/clibuilder/api/command/#examples) (Unreleased) gets an
`Examples:` section at the end.

A boolean option is a flag, so it shows as `[--flag]` rather than `[--flag=boolean]`. An option with
no declared type is a flag too, and an argument with no declared type is a required string.

For an input problem the parser cannot detect, throw a
[`CliError`](/clibuilder/guides/failing/) instead of calling `showHelp()`:

```ts
run(args) {
  if (args.from && args.to && args.from > args.to) {
    throw new CliError('--from must not be later than --to', {
      code: 'invalid-range',
      help: 'run `app --help` for the options'
    })
  }
  // ...
}
```
