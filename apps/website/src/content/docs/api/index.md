---
title: API Reference
description: Everything clibuilder exports.
---

`clibuilder` has a small surface. Everything below is a named export of the package root, unless
its row names a subpath:

```ts
import { cli, command, parseArgv, t } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'
```

## Functions

| Export | Purpose |
| --- | --- |
| [`cli()`](/clibuilder/api/cli/) | Create the CLI builder — the entry point of every application |
| [`command()`](/clibuilder/api/command/) | Identity helper that types a standalone command object |
| [`testCommand()`](/clibuilder/api/test-command/) | Run a command in-process and capture its result and messages, from `clibuilder/testing` (the root export is removed in v12) |
| [`config()`](/clibuilder/api/config/) | The config extension, passed to `.use()`, from `clibuilder/config` |
| `defineKey()` / `defineCollectionKey()` | Create typed plugin registry keys |
| [`parseArgv()`](/clibuilder/api/parse-argv/) | The raw argv tokenizer, exported for reuse |
| [`enableCompileCache()`](/clibuilder/api/compile-cache/) | Opt into Node's V8 compile cache, from `clibuilder/compile-cache` |
| [`clibuilder/axi`](/clibuilder/api/axi/) | Truncation, counts, the empty state and the home header, from the `clibuilder/axi` subpath |
| `isCliError()` | Whether a caught value is a [`CliError`](/clibuilder/guides/failing/) |

## Values

| Export | Purpose |
| --- | --- |
| [`t`](/clibuilder/api/t/) | The type descriptors for arguments and options (replaces `z`) |
| [`result`, `document`, `empty`](/clibuilder/api/cli/#the-result-channel) | Mark what `run()` returns as a result, a document or an empty state |
| [`exitCodes`](/clibuilder/guides/failing/#exit-codes) | The codes the cli exits with — `success`, `error`, `usage` |
| [`CliError`](/clibuilder/guides/failing/#failing-from-a-command) | Thrown from `run()` to fail the cli with a message and an exit code |

## Types

| Export | Purpose |
| --- | --- |
| [`cli.Options`](/clibuilder/api/cli/#options) | Options accepted by `cli()` |
| [`cli.UsageError`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) | One usage error found while parsing, as passed to `onUsageError` |
| [`cli.UsageErrorHandler`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) | The signature of `onUsageError`, on `cli()` options and on a command |
| [`cli.UsageErrorContext`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) | The second argument of `onUsageError`: `command`, `ui`, `format`, `exitCode` |
| [`cli.Format`](/clibuilder/guides/failing/#reporting-usage-errors-yourself) | `'toon' \| 'json' \| 'text'` |
| [`cli.Command`](/clibuilder/api/command/#clicommand) | The shape of a command |
| [`cli.Command.Argument`](/clibuilder/api/command/#arguments) | A positional argument declaration |
| [`cli.Command.Options`](/clibuilder/api/command/#options) | The options record declaration |
| [`Answer`](/clibuilder/api/cli/#the-result-channel) | What `result()`, `document()` and `empty()` return |
| [`Renderer`](/clibuilder/api/cli/#the-result-channel) | `(value) => string`, renders a result for one format |
| [`ConfigExtension`](/clibuilder/api/config/#types) | The type of what `config()` returns |
| [`UI`](/clibuilder/api/ui/) | The object on `this.ui` inside `run()` |
| [`DisplayLevel`](/clibuilder/api/ui/#displaylevel) | `'none' \| 'info' \| 'debug' \| 'trace'` |
| [`Extension`](/clibuilder/api/cli/#useextension) | A function passed to `.use()` (11.5.0) |
| [`ExtensionContext`](/clibuilder/api/cli/#useextension) | What an extension receives (11.5.0) |
| [`PluginActivationContext`](/clibuilder/api/command/#pluginactivationcontext) | What a plugin's `activate()` receives |
| [`mockExtensionContext()`](/clibuilder/api/test-command/#mockextensioncontext) | A context for testing an extension passed to `.use()`, from `clibuilder/testing` |
| [`mockPluginContext()`](/clibuilder/guides/plugins/) | A context for testing a deprecated plugin's `activate()`, from `clibuilder/testing` |
| `Registry` | Read-only values and contributions available as `this.registry` in commands |

Most of the command types live under the `cli` namespace rather than at the top level, so you rarely
import them directly — `command()` infers them for you.
