---
title: Your First CLI
description: Build a working CLI end to end — a default command, a named command, arguments, options, and help.
---

This walkthrough builds a small CLI called `greet` from nothing to something you can run.

## 1. The smallest CLI

Every CLI starts with [`cli()`](/clibuilder/api/cli/). `name` and `version` are required — they feed
the help message and `--version`.

```ts
// src/index.ts
import { cli } from 'clibuilder'

cli({ name: 'greet', version: '1.0.0' })
  .default({
    run() {
      this.ui.info('hello world')
    }
  })
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

`.default()` defines the command that runs when no sub-command is named — `greet` on its own.
`.parse()` returns a promise; reject handling is yours, and the convention above exits with the
error's `code` when it has one.

:::note
`.parse()` only exists once the builder has something to run — after `.default()`, after
`.command()`, or immediately when the CLI declares `config` (a config-driven CLI can get its commands
from plugins). That is a type-level guard, so TypeScript tells you before you run it.
:::

## 2. Take an argument

Arguments are positional and declared in order. Without a `type` they are strings.

```ts
cli({ name: 'greet', version: '1.0.0' })
  .default({
    arguments: [{ name: 'name', description: 'who to greet' }],
    run(args) {
      // args.name is string
      this.ui.info(`hello, ${args.name}`)
    }
  })
  .parse(process.argv)
```

```sh
$ greet world
hello, world
```

## 3. Take an option

Options are named and declared as a record. Without a `type` they are `boolean | undefined`.

```ts
.default({
  arguments: [{ name: 'name', description: 'who to greet' }],
  options: {
    loud: { description: 'shout it', alias: ['l'] }
  },
  run(args) {
    const message = `hello, ${args.name}`
    this.ui.info(args.loud ? message.toUpperCase() : message)
  }
})
```

```sh
$ greet world --loud
HELLO, WORLD
$ greet world -l
HELLO, WORLD
```

See [Arguments & Options](/clibuilder/guides/arguments-and-options/) for typed and optional values.

## 4. Add a named command

`.command()` adds a sub-command. It can be chained as many times as you like, and commands can nest.

```ts
import { cli, command } from 'clibuilder'

cli({ name: 'greet', version: '1.0.0' })
  .command({
    name: 'hello',
    description: 'say hello',
    run() {
      this.ui.info('hello world')
    }
  })
  .command({
    name: 'repo',
    description: 'manage repositories',
    commands: [
      command({
        name: 'create',
        description: 'create a repository',
        arguments: [{ name: 'name', description: 'repository name' }],
        run(args) {
          this.ui.info(`creating ${args.name}`)
        }
      })
    ]
  })
  .parse(process.argv)
```

```sh
$ greet hello
hello world
$ greet repo create my-project
creating my-project
```

A command with `commands` but no `run` is a group: invoking it prints its help.

## 5. What you get for free

Every CLI answers these without you writing them:

| Flag | Alias | Effect |
| --- | --- | --- |
| `--help` | `-h` | Print the help message for the resolved command |
| `--version` | `-v` | Print the CLI version |
| `--verbose` | `-V` | Raise the display level to `debug` |
| `--silent` | | Suppress all UI output |
| `--debug-cli` | | Raise the display level to `trace`, including clibuilder's own messages |

The help message is generated from the `description` fields on the CLI, its commands, arguments, and
options — which is why they are worth writing carefully.

## 6. Make it executable

Add a shebang to your entry file and point `bin` at it:

```ts
#!/usr/bin/env node
import { cli } from 'clibuilder'
// ...
```

```json
{
  "bin": { "greet": "./esm/index.js" }
}
```

See [Publishing](/clibuilder/guides/publishing/) for the rest.

## Where next

- [Commands](/clibuilder/guides/commands/) — aliases, nesting, and command groups.
- [Configuration](/clibuilder/guides/configuration/) — let users put settings in a file.
- [Testing](/clibuilder/guides/testing/) — assert on a command without spawning a process.
