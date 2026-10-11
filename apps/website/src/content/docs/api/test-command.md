---
title: testCommand()
description: Run a command in-process and capture its result and its UI messages.
---

```ts
function testCommand(
  command: cli.Command,
  argv: string,
  config?: Record<string, any>,
  options?: { output?: 'axi' | 'console' }
): Promise<{ result: any; messages: string; exitCode: number | undefined }>
```

Runs a single command against a throwaway CLI (`test-cli`, version `1.0.0`) and returns what it did.
No process is spawned and no config file is read.

Import it from `clibuilder/testing`. clibuilder 11.5.0 also exports it, deprecated, from the root entry;
v12 (unreleased) removes that export, so test code stays off a CLI's import graph.

```ts
import { command } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'

const { result, messages } = await testCommand(
  command({
    name: 'cmd-a',
    description: 'a command',
    run() {
      this.ui.info('miku')
      return 'x'
    }
  }),
  'cmd-a'
)

expect(result).toBe('x')
// what the command said, then the answer it printed
expect(messages).toBe('miku\nx')
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `command` | `cli.Command` | The command to run. Sub-commands come along with it. |
| `argv` | `string` | The command line *after* the CLI name — `'cmd-a --flag value'`. |
| `config` | `Record<string, any>` | Optional. Stands in for the config file the command would have loaded. Still validated against the command's `config` schema. |
| `options.output` | `'axi' \| 'console'` | **v12, unreleased.** The [output mode](/clibuilder/api/cli/#streams-and-output) of the CLI under test, as `cli({ output })` takes it. Defaults to `'axi'`. Pass `'console'` to test a CLI that sets `output: 'console'`. |

## Returns

| Field | Type | Description |
| --- | --- | --- |
| `result` | `any` | What `run()` returned or resolved to. When the CLI fails instead, the exit code. |
| `messages` | `string` | Everything the CLI wrote, stdout and stderr together, in the order it was written, with no trailing newline. That is what `this.ui` said and, with `output: 'axi'`, the printed answer: a returned value, a `CliError` report or a usage error. Empty when nothing was printed. |
| `exitCode` | `number \| undefined` | The code the cli would have exited with, or `undefined` when it did not fail. |

The display level is `info`, so `this.ui.debug()` output does **not** appear in `messages` unless the
`argv` you pass includes `--verbose`.

## Sub-commands

Address a nested command by its full path:

```ts
const repo = command({
  name: 'repo',
  description: 'manage repositories',
  commands: [create, remove]
})

const { messages } = await testCommand(repo, 'repo create my-project')
```

## Config

```ts
const { result } = await testCommand(
  command({
    name: 'cfg',
    description: 'reads config',
    config: z.object({ a: z.string() }), // z from your own 'zod'
    run() {
      return this.config
    }
  }),
  'cfg',
  { a: 'hi' }
)

expect(result).toEqual({ a: 'hi' })
```

Passing a config that fails the schema is how you test the failure path. `exitCode` is `1`, and
`messages` carries the report: `error: config fails validation`, `code: invalid-config` and the
messages for each key. With `output: 'console'` it carries the validation errors and the help
message instead.

## Asserting on failures

Failures don't reject — they are reported and recorded. Assert on `exitCode` and `messages`:

```ts
const { messages, exitCode } = await testCommand(cmd, 'cmd --unknown-flag')
expect(exitCode).toBe(2)
expect(messages).toContain('error: unknown option --unknown-flag')
expect(messages).toContain('code: unknown-option')
```

A command that throws [`CliError`](/clibuilder/guides/failing/) is recorded the same way, with the
code it chose.

See [Testing](/clibuilder/guides/testing/) for the wider picture, including injecting fakes through a
command's `context`.
