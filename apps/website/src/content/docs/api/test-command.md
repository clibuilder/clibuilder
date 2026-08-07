---
title: testCommand()
description: Run a command in-process and capture its result and its UI messages.
---

```ts
function testCommand(
  command: cli.Command,
  argv: string,
  config?: Record<string, any>
): Promise<{ result: any; messages: string }>
```

Runs a single command against a throwaway CLI (`test-cli`, version `1.0.0`) and returns what it did.
No process is spawned and no config file is read.

```ts
import { command, testCommand } from 'clibuilder'

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
expect(messages).toBe('miku')
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `command` | `cli.Command` | The command to run. Sub-commands come along with it. |
| `argv` | `string` | The command line *after* the CLI name — `'cmd-a --flag value'`. |
| `config` | `Record<string, any>` | Optional. Stands in for the config file the command would have loaded. Still validated against the command's `config` schema. |

## Returns

| Field | Type | Description |
| --- | --- | --- |
| `result` | `any` | What `run()` returned or resolved to. |
| `messages` | `string` | Everything written through `this.ui` — `info`, `warn`, and `error` — joined with `\n`. Empty when nothing was printed. |

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
    config: z.object({ a: z.string() }),
    run() {
      return this.config
    }
  }),
  'cfg',
  { a: 'hi' }
)

expect(result).toEqual({ a: 'hi' })
```

Passing a config that fails the schema is how you test the failure path — `result` is `undefined` and
`messages` carries the validation errors and the help message.

## Asserting on failures

Usage errors don't reject; they print help. So assert on `messages`:

```ts
const { result, messages } = await testCommand(cmd, 'cmd --unknown-flag')
expect(result).toBeUndefined()
expect(messages).toContain('Usage:')
```

See [Testing](/clibuilder/guides/testing/) for the wider picture, including injecting fakes through a
command's `context`.
