---
title: API Reference
description: Everything clibuilder exports.
---

`clibuilder` has a small surface. Everything below is a named export of the package root:

```ts
import { cli, command, testCommand, parseArgv, z } from 'clibuilder'
```

## Functions

| Export | Purpose |
| --- | --- |
| [`cli()`](/clibuilder/api/cli/) | Create the CLI builder — the entry point of every application |
| [`command()`](/clibuilder/api/command/) | Identity helper that types a standalone command object |
| [`testCommand()`](/clibuilder/api/test-command/) | Run a command in-process and capture its result and messages |
| `defineKey()` / `defineCollectionKey()` | Create typed plugin registry keys |
| [`parseArgv()`](/clibuilder/api/parse-argv/) | The raw argv tokenizer, exported for reuse |
| [`enableCompileCache()`](/clibuilder/api/compile-cache/) | Opt into Node's V8 compile cache, from `clibuilder/compile-cache` |
| `isCliError()` | Whether a caught value is a [`CliError`](/clibuilder/guides/failing/) |

## Values

| Export | Purpose |
| --- | --- |
| [`z`](/clibuilder/api/zod/) | The zod instance used for every schema in the library |
| [`exitCodes`](/clibuilder/guides/failing/#exit-codes) | The codes the cli exits with — `success`, `error`, `usage` |
| [`CliError`](/clibuilder/guides/failing/#failing-from-a-command) | Thrown from `run()` to fail the cli with a message and an exit code |

## Types

| Export | Purpose |
| --- | --- |
| [`cli.Options`](/clibuilder/api/cli/#options) | Options accepted by `cli()` |
| [`cli.Command`](/clibuilder/api/command/#clicommand) | The shape of a command |
| [`cli.Command.Argument`](/clibuilder/api/command/#arguments) | A positional argument declaration |
| [`cli.Command.Options`](/clibuilder/api/command/#options) | The options record declaration |
| [`UI`](/clibuilder/api/ui/) | The object on `this.ui` inside `run()` |
| [`DisplayLevel`](/clibuilder/api/ui/#displaylevel) | `'none' \| 'info' \| 'debug' \| 'trace'` |
| [`PluginActivationContext`](/clibuilder/api/command/#pluginactivationcontext) | What a plugin's `activate()` receives |
| `Registry` | Read-only values and contributions available as `this.registry` in commands |

Most of the command types live under the `cli` namespace rather than at the top level, so you rarely
import them directly — `command()` infers them for you.
