---
title: Testing
description: Test commands in-process with testCommand() — assert on the return value and on what the command printed.
---

Commands are plain objects, so you can test them without spawning a process. `testCommand()` runs one
against a throwaway CLI and hands back both what it returned and what it printed.

## `testCommand()`

```ts
import { command, testCommand } from 'clibuilder'

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
  expect(messages).toBe('miku')
})
```

- **`result`** is whatever `run()` returned or resolved to.
- **`messages`** is everything the command wrote through `this.ui`, joined with newlines — `info`,
  `warn`, and `error` all land here, so a test can assert on user-facing output without capturing
  stdout.

The second parameter is the command line *after* the CLI name. Pass arguments and options the way a
user would type them:

```ts
await testCommand(sumCommand, 'sum --verbose 1 2 3')
```

## Testing with config

The third parameter supplies the config the command would have loaded from disk, so no fixture file
is needed:

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
