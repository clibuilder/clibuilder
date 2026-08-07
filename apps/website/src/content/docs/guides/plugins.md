---
title: Plugins
description: Ship commands as separate packages and load them into a CLI through its config file.
---

A plugin is an ordinary npm package that exports an `activate()` function and adds commands through
it. This is how a CLI can be built in a distributed fashion — the core stays small, and features ship
as packages that plug into it.

## Enabling plugins in your CLI

Plugins are loaded through the [config file](/clibuilder/guides/configuration/), so a plugin-capable
CLI declares `config`. Declare `keywords` too — they are how `plugins search` and `plugins list`
find candidate packages on npm and on disk.

```ts
cli({
  name: 'my-cli',
  version: '1.0.0',
  config: true,
  keywords: ['my-cli-plugin']
})
  .parse(process.argv)
```

If you declare `config` without `keywords`, the CLI name is used as the keyword.

## Listing plugins in config

```json
{
  "plugins": ["my-cli-plugin", "@scope/another-plugin"]
}
```

Each entry is imported by name, resolved from the current working directory. Their commands are
added to the CLI before `parse()` resolves which command to run.

:::note[Why config, not discovery]
Before v8, `clibuilder` scanned `node_modules` to discover plugins. Listing them explicitly is
dramatically faster to start, and works with package managers that don't lay out a flat
`node_modules` — Yarn PnP and pnpm.
:::

## Writing a plugin

Export an `activate` function that takes a `PluginActivationContext` and calls `addCommand`:

```ts
import { command, type PluginActivationContext } from 'clibuilder'

const sing = command({
  name: 'sing',
  description: 'sing a song',
  run() {
    this.ui.info('🎵')
  }
})

const dance = command({
  name: 'dance',
  description: 'dance a dance',
  run() {
    this.ui.info('💃')
  }
})

export function activate({ addCommand }: PluginActivationContext) {
  addCommand({
    name: 'miku',
    description: 'vocaloid commands',
    commands: [sing, dance]
  })
}
```

Then add the host CLI's keyword to your `package.json` so the package is discoverable:

```json
{
  "name": "my-cli-plugin",
  "keywords": ["my-cli-plugin", "vocaloid"],
  "main": "./cjs/index.js",
  "exports": { "import": "./esm/index.js", "require": "./cjs/index.js" }
}
```

`addCommand` may be called more than once to contribute several top-level commands.

A plugin that fails to import, or that has no `activate` export, is skipped with a warning rather
than crashing the CLI — run with `--verbose` to see which plugin was skipped and why.

## The built-in `plugins` command

A CLI that accepts config (or declares keywords) automatically gets a `plugins` command:

```sh
# Installed packages carrying the CLI's keywords
$ my-cli plugins list
$ my-cli plugins ls

# Packages on npm carrying the CLI's keywords
$ my-cli plugins search
```

`list` looks at what is installed; `search` looks at the registry. Neither installs anything or edits
your config — adding a plugin to `plugins` is a deliberate act.

## Testing a plugin

A plugin's commands are just commands, so
[`testCommand()`](/clibuilder/api/test-command/) tests them directly, without a host CLI:

```ts
import { testCommand } from 'clibuilder'
import { activate } from '../src/index.js'

test('miku sings', async () => {
  const commands: any[] = []
  activate({ addCommand: cmd => commands.push(cmd) })

  const { messages } = await testCommand(commands[0], 'miku sing')
  expect(messages).toBe('🎵')
})
```
