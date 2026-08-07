---
title: UI
description: this.ui — how a command talks to the user, and how the display level is controlled.
---

Every command's `run()` gets a `UI` on `this.ui`. Use it instead of `console.log`: it respects the
display level the user asked for, and it is what [`testCommand()`](/clibuilder/api/test-command/)
captures as `messages`.

```ts
type UI = {
  displayLevel: DisplayLevel
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  debug(...args: any[]): void
  showHelp(): void
  showVersion(): void
}
```

## Methods

| Method | Shown at level | Use for |
| --- | --- | --- |
| `error(...)` | `info` and above | Something failed |
| `warn(...)` | `info` and above | Something is off but survivable |
| `info(...)` | `info` and above | Ordinary output — the default |
| `debug(...)` | `debug` and above | Diagnostics the user asked for with `--verbose` |
| `showHelp()` | — | Print the current command's generated help message |
| `showVersion()` | — | Print the CLI's version |

All four logging methods take any number of arguments and join them, like `console.log`.

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

The help message is generated from the descriptions on the CLI, the resolved command, its arguments,
and its options — you never write it by hand. It is printed automatically when a command has no
`run`, when `--help` is passed, or when parsing fails.

```
Usage: app <arguments> [options]

Arguments:
  [values]               values to add

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
```

Calling it yourself is the right move when a command detects an input problem it can't express in a
schema:

```ts
run(args) {
  if (args.from && args.to && args.from > args.to) {
    this.ui.error('--from must not be later than --to')
    return this.ui.showHelp()
  }
  // ...
}
```
