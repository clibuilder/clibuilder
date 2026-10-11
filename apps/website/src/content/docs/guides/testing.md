---
title: Testing
description: Test commands in-process with testCommand() — assert on the return value and on what the command printed.
---

Commands are plain objects, so you can test them without spawning a process. `testCommand()` runs one
against a throwaway CLI and hands back both what it returned and what it printed.

## `testCommand()`

```ts
import { command } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'

test('cmd-a returns x and says miku', async () => {
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
  // what the command said, then the answer the cli printed
  expect(messages).toBe('miku\nx')
})
```

- **`result`** is whatever `run()` returned or resolved to. When the cli fails instead, it is the
  exit code.
- **`exitCode`** is the code the cli would have exited with, or `undefined` when the command did not
  fail — see [Failing](/clibuilder/guides/failing/).
- **`messages`** is everything the cli wrote, stdout and stderr together, joined with newlines, in
  the order it was written. `info`, `warn` and `error` all land here, and so does the printed answer:
  a returned value, a `CliError` report or a usage error. A test can assert on user-facing output
  without capturing stdout.

**v12, unreleased:** `testCommand()` runs the cli in the default `output: 'axi'`, so `messages`
includes the printed answer. To test a cli that sets `output: 'console'`, pass the same mode as
`options.output`. Then a returned value is not printed, as in 11.5.0:

```ts
const { messages } = await testCommand(cmd, 'cmd-a', { output: 'console' })
expect(messages).toBe('miku')
```

The second parameter is the command line *after* the CLI name. Pass arguments and options the way a
user would type them:

```ts
await testCommand(sumCommand, 'sum --verbose 1 2 3')
```

## Testing with config

`options.config` supplies the config the command would have loaded from disk, so no fixture file
is needed:

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
  { config: { a: 'hi' } }
)

expect(result).toEqual({ a: 'hi' })
```

The config you pass still goes through the command's schema, so this is also how you test that an
invalid config is rejected.

## Testing sub-commands

Address a nested command by its full path, exactly as a user would:

```ts
const repo = command({
  name: 'repo',
  description: 'manage repositories',
  commands: [create, remove]
})

await testCommand(repo, 'repo create my-project')
```

## Injecting dependencies with `context`

A command's `context` is the seam for the I/O it does. Declare the real implementation on the
command, and give the test a fake — no module mocking involved.

```ts
const show = command({
  name: 'show',
  description: 'print a file',
  context: { readFile },
  arguments: [{ name: 'file', description: 'file to print' }],
  async run(args) {
    this.ui.info(await this.context.readFile(args.file, 'utf8'))
  }
})

test('show prints the file', async () => {
  const { messages } = await testCommand(
    { ...show, context: { readFile: async () => 'contents' } },
    'show a.txt'
  )
  expect(messages).toBe('contents')
})
```

## Testing the whole CLI

For an end-to-end check, `parse()` an argv array yourself — it resolves to the invoked command's
return value:

```ts
const app = cli({ name: 'app', version: '1.0.0' }).default({ run: () => 42 })

expect(await app.parse(['node', 'app'])).toBe(42)
```

Note that `parse()` takes a full `process.argv`: the first two entries are skipped as the node
binary and the script path.
