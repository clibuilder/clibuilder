---
title: Commands
description: Default commands, named commands, sub-commands, aliases, and command context.
---

A `clibuilder` CLI is a tree of commands. The root of the tree is the CLI itself; `.default()` gives
that root something to run, and `.command()` hangs named commands off it.

## The default command

`.default()` defines what runs when no sub-command is named. It has no `name` — the CLI's name is its
name.

```ts
cli({ name: 'app', version: '1.0.0' })
  .default({
    description: 'do the thing',
    run() {
      this.ui.info('running')
    }
  })
  .parse(process.argv)
```

`.default()` can be called only once — it is removed from the builder type after the first call.

## Named commands

```ts
cli({ name: 'app', version: '1.0.0' })
  .command({
    name: 'hello',
    description: 'say hello',
    run() {
      this.ui.info('hello world')
    }
  })
  .command({
    name: 'goodbye',
    description: 'say goodbye',
    run() {
      this.ui.info('goodbye')
    }
  })
  .parse(process.argv)
```

Each `.command()` returns the builder, so they chain.

## Sub-commands

A command can carry its own `commands`, to any depth. Use the
[`command()`](/clibuilder/api/command/) helper for the nested ones — it does nothing at runtime, but
it gives you type inference and editor completion on a standalone command object.

```ts
import { cli, command } from 'clibuilder'

const create = command({
  name: 'create',
  description: 'create a repository',
  arguments: [{ name: 'name', description: 'repository name' }],
  run(args) {
    this.ui.info(`creating ${args.name}`)
  }
})

const remove = command({
  name: 'remove',
  alias: ['rm'],
  description: 'remove a repository',
  arguments: [{ name: 'name', description: 'repository name' }],
  run(args) {
    this.ui.info(`removing ${args.name}`)
  }
})

cli({ name: 'app', version: '1.0.0' })
  .command({ name: 'repo', description: 'manage repositories', commands: [create, remove] })
  .parse(process.argv)
```

```sh
$ app repo create my-project
$ app repo rm my-project
```

### Command groups

A command may declare `commands` **without** a `run`. That makes it a pure group: invoking it on its
own prints the group's help message listing its sub-commands. This is enforced in the type — a
command must have either a `run` or a `commands`.

## Aliases

Both commands and options take aliases.

```ts
command({
  name: 'search-packages',
  alias: ['sp'],
  description: 'search for packages',
  run() { /* ... */ }
})
```

```sh
$ app sp    # same as `app search-packages`
```

## Inside `run()`

`run` is called with `this` bound to a command instance. It is a regular method, not an arrow
function — that binding is the point.

| `this` | What it is |
| --- | --- |
| `this.ui` | The [UI](/clibuilder/api/ui/) — `info`, `warn`, `error`, `debug`, `showHelp`, `showVersion` |
| `this.config` | The loaded, validated [config](/clibuilder/guides/configuration/), typed from the command's `config` schema |
| `this.cwd` | The directory the CLI was invoked from |
| `this.keywords` | The `keywords` declared on the CLI, used for [plugin](/clibuilder/guides/plugins/) lookup |
| `this.context` | Whatever you put in the command's `context` — see below |

The first parameter, `args`, holds the parsed
[arguments and options](/clibuilder/guides/arguments-and-options/).

### `context` — the seam for testing

A command can declare a `context` object, and it is handed back on `this.context`. Put your I/O
dependencies there and a test can substitute them without mocking modules.

```ts
import { readFile } from 'node:fs/promises'

command({
  name: 'show',
  description: 'print a file',
  context: { readFile },
  arguments: [{ name: 'file', description: 'file to print' }],
  async run(args) {
    this.ui.info(await this.context.readFile(args.file, 'utf8'))
  }
})
```

## Return values

Whatever `run()` returns (or resolves to) becomes the resolved value of `.parse()`. That is mostly
useful in tests — [`testCommand()`](/clibuilder/api/test-command/) hands it back as `result` — but it
also lets one program drive another's commands directly.

```ts
const total = await cli({ name: 'app', version: '1.0.0' })
  .default({ run: () => 42 })
  .parse(process.argv)
// total === 42
```
