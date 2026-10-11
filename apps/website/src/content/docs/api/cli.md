---
title: cli()
description: Create the CLI builder — options, the builder methods, and parse().
---

```ts
function cli(options: cli.Options): cli.Builder
```

Creates the builder that every `clibuilder` application starts from.

```ts
import { cli } from 'clibuilder'

const app = cli({ name: 'app', version: '1.0.0' })
```

## Options

```ts
namespace cli {
  type Options = {
    name: string
    version: string
    description?: string
    config?: string | boolean
    keywords?: string[]
    onUsageError?: UsageErrorHandler
  }
}
```

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required.** The CLI's name — used in the help message, as the default config name, and as the default plugin keyword. |
| `version` | `string` | **Required.** Printed by `--version`. Since v8 this is not read from `package.json` — see [Publishing](/clibuilder/guides/publishing/). |
| `description` | `string` | A short summary shown at the top of the help message. |
| `config` | `string \| boolean` | Opt into a [config file](/clibuilder/guides/configuration/). `true` derives the config name from `name`; a string overrides it. |
| `keywords` | `string[]` | Keywords used by the built-in `plugins list` / `plugins search` commands. Defaults to `[name]` when `config` is set. Planned for removal in v12, where it becomes an option of [`plugins()`](/clibuilder/packages/plugins/#options). |
| `onUsageError` | `UsageErrorHandler` | Takes over how usage errors are reported, for every command that declares no handler of its own. See [Reporting usage errors yourself](/clibuilder/guides/failing/#reporting-usage-errors-yourself). |

Declaring `config` or `keywords` also adds the built-in `plugins` command to the CLI, unless the CLI
uses [`@clibuilder/plugins`](/clibuilder/packages/plugins/), which adds its own.

## `Builder`

```ts
type Builder = {
  readonly name: string
  readonly version: string
  readonly description: string
  default(command): Omit<this, 'default'> & Executable
  command(command): this & Executable
  use(extension): this & Executable
}
```

### `.default(command)`

Defines the command that runs when no sub-command is named. Takes a
[command](/clibuilder/api/command/) **without** a `name` — the CLI's name is its name.

```ts
cli({ name: 'app', version: '1.0.0' }).default({
  description: 'do the thing',
  run() {
    this.ui.info('running')
  }
})
```

Can be called once: `default` is removed from the returned type afterwards.

### `.command(command)`

Adds a named command. Returns the builder, so calls chain.

```ts
cli({ name: 'app', version: '1.0.0' })
  .command({ name: 'a', description: 'command a', run() {} })
  .command({ name: 'b', description: 'command b', run() {} })
```

See [`command()`](/clibuilder/api/command/) for the full shape.

### `.use(extension)`

:::caution[Unreleased]
`.use()` is on `main` for `clibuilder` 11.5.0, which is not published yet.
:::

Adds an extension: a function that adds commands and registry entries before `parse()` picks the
command to run. [`@clibuilder/plugins`](/clibuilder/packages/plugins/) is one.

```ts
import type { Extension } from 'clibuilder'

const hello: Extension = ({ addCommand }) => {
  addCommand({ name: 'hello', run: () => 'world' })
}

cli({ name: 'app', version: '1.0.0' }).use(hello).parse(process.argv)
```

```ts
type Extension = (context: ExtensionContext) => void | Promise<void>

type ExtensionContext = {
  readonly host: { readonly name: string; readonly version: string }
  readonly cwd: string
  readonly ui: UI
  readonly registry: RegistryOwner
  addCommand(command: cli.Command): void
  resolveConfig(): Promise<ConfigLoadResult>
}
```

| Field | Description |
| --- | --- |
| `host` | The CLI's `name` and `version` |
| `cwd` | The working directory the CLI runs in |
| `ui` | The CLI's own [UI](/clibuilder/api/ui/), so messages follow `--silent`, `--verbose` and `--debug-cli` |
| `registry` | The registry that commands read as `this.registry`. `register(source, key, value)` adds a value under a `defineKey()` or `defineCollectionKey()` key |
| `addCommand(command)` | Adds a top-level command |
| `resolveConfig()` | Resolves to the CLI's config and where it came from. `source.type` is `'none'` when the CLI sets no `config` |

When extensions run:

- They run once, on the first `parse()` that needs the command tree. Building the CLI does not run them.
- They run in the order `.use()` was called. Each one is awaited before the next starts, so the
  command order is the same on every run.
- Their commands come after the CLI's own `.command()` and `.default()` commands.
- A bare `--version` or `-v` is answered before anything loads, so extensions do not run for it.
  See [the version fast path](/clibuilder/guides/arguments-and-options/#built-in-options).
- `--help` waits for them, because it lists their commands.

`.use()` makes `parse()` available, because an extension may supply every command.

## `Executable`

```ts
type Executable = {
  parse<R = any>(argv: string[]): Promise<R>
}
```

### `.parse(argv)`

Parses the command line, resolves the command, validates its arguments, options, and config, and
calls its `run()`. Resolves to whatever `run()` returned.

```ts
app.parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

`argv` is a full `process.argv` — the first two entries (the node binary and the script path) are
skipped.

:::note[When `parse()` exists]
`parse` appears on the type only after the builder has something to run: after `.default()`, after
`.command()`, or immediately if the CLI was created with `config`. A config-driven CLI can get all
of its commands from plugins, so it is executable from the start.
:::

`parse()` does **not** reject for usage problems. An unknown flag, a missing required argument, a
value that fails its schema, or a config that fails validation all cause the help message to be
printed and the promise to resolve. Only an error thrown by your own `run()` rejects.

## Full example

```ts
#!/usr/bin/env node
import { cli, command, z } from 'clibuilder'

cli({
  name: 'app',
  version: '1.0.0',
  description: 'an example CLI',
  config: true,
  keywords: ['app-plugin']
})
  .default({
    config: z.object({ presets: z.string() }),
    run() {
      this.ui.info(`presets: ${this.config.presets}`)
    }
  })
  .command(
    command({
      name: 'build',
      description: 'build the project',
      options: { watch: { description: 'rebuild on change', alias: ['w'] } },
      run(args) {
        this.ui.info(args.watch ? 'watching' : 'building once')
      }
    })
  )
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```
