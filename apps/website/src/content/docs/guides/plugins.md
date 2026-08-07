---
title: Plugins
description: Ship commands as separate packages, load them into a CLI through its config file, and make them discoverable through keywords.
---

A plugin is an ordinary npm package that exports an `activate()` function and adds commands through
it. This is how a CLI can be built in a distributed fashion — the core stays small, and features ship
as packages that plug into it.

Two mechanisms are involved, and it helps to keep them apart:

- **Loading** — which plugins actually run. Driven by the `plugins` array in the CLI's config file.
- **Discovery** — which plugins *exist*, on disk or on npm, so a user can decide what to load. Driven
  by the CLI's `keywords`.

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

A CLI "accepts plugins" if it sets `config` **or** a non-empty `keywords`. That single condition is
what turns on config-driven plugin loading and adds the built-in `plugins` command.

### Choosing a keywords namespace

A keyword is a public contract: it is the string a plugin author has to put in their
`package.json` for your users to find their package. Pick one that is unlikely to collide with
anything else on npm, and then treat it as stable — changing it later orphans every plugin already
published against the old one.

`<cli-name>-plugin` is the convention this library's own fixtures use, and it is a good default:

```ts
cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })
```

A few notes on the shape of the list:

- **The CLI name alone is a weak keyword.** `keywords: ['my-cli']` matches anything on npm that
  happens to carry your CLI's name — including packages that have nothing to do with your plugin
  contract. The `-plugin` suffix narrows it to packages that opted in deliberately.
- **`keywords` is an array**, and a package matches if it carries *any* of them. That is the escape
  hatch for renaming: publish under the new keyword and keep the old one listed until the ecosystem
  catches up.
- **If you set `config` and omit `keywords`, the CLI `name` is used as the keyword.** This is a
  convenience default, not a recommendation — a CLI that expects a real plugin ecosystem should
  declare its namespace explicitly.

```ts
// keywords is ['my-cli'] — same as writing keywords: ['my-cli']
cli({ name: 'my-cli', version: '1.0.0', config: true })
```

The default also applies when `config` names a different file — the keyword still comes from `name`,
not from the config name:

```ts
// config file is `my-tool.json`, but the plugin keyword is still 'my-cli'
cli({ name: 'my-cli', version: '1.0.0', config: 'my-tool' })
```

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

The trade-off is that installing a plugin is not enough to activate it — the user also adds it to
`plugins`. That is deliberate: a package that lands in `node_modules` as a transitive dependency
should not be able to inject commands into a CLI the user runs.

A plugin that fails to import, or that has no `activate` export, is skipped with a warning rather
than crashing the CLI. Run with `--verbose` to see which plugin was skipped and why:

```sh
$ my-cli --verbose --help
clibuilder loading plugin bad-plugin
clibuilder not a valid plugin bad-plugin
```

## The built-in `plugins` command

Any CLI that accepts plugins gets a `plugins` command added automatically. You do not register it,
and it shows up in the help output alongside your own commands:

```sh
$ my-cli plugins -h

Usage: my-cli plugins <command>

  Commands related to the plugins of the cli

Commands:
  list (ls), search

plugins <command> -h     Get help for <command>
```

The two sub-commands answer two different questions.

### `plugins list` — what is installed

`list` walks the packages installed in the current working directory and reports the ones carrying
any of the CLI's keywords. It reads the local dependency tree only; it never touches the network.

```sh
$ my-cli plugins list
found the following plugins:

  my-cli-plugin
  my-cli-plugin-git
  @acme/my-cli-plugin-deploy
```

With exactly one match, and with none:

```sh
$ my-cli plugins list
found one plugin: my-cli-plugin
```

```sh
$ my-cli plugins list
no plugin with keywords: my-cli-plugin
```

Note what `list` is *not*: it reports what is installed, not what is loaded. A package can appear
here and still be inert because it is missing from the config's `plugins` array.

### `plugins search` — what exists on npm

`search` queries the npm registry for published packages carrying the CLI's keywords. This is how a
user finds a plugin they have not installed yet.

```sh
$ my-cli plugins search
found the following packages:

  my-cli-plugin
  my-cli-plugin-git
  @acme/my-cli-plugin-deploy
```

The zero- and one-result forms mirror `list`, worded for packages rather than plugins:

```sh
$ my-cli plugins search
no package with keywords: my-cli-plugin
```

```sh
$ my-cli plugins search
found one package: my-cli-plugin
```

Neither sub-command installs anything or edits your config. Adopting a plugin stays a deliberate,
two-step act:

```sh
$ my-cli plugins search        # find it
$ npm install my-cli-plugin    # install it
                               # then add it to `plugins` in the config file
```

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

`addCommand` may be called more than once to contribute several top-level commands. The commands it
receives are ordinary [commands](/clibuilder/guides/commands/) — arguments, options, sub-commands,
and config schemas all work exactly as they do in the host CLI.

`activate` is called during `parse()`, before the CLI resolves which command to run. Keep it cheap:
build command objects and return. Anything expensive belongs inside `run()`, so a user typing
`my-cli --help` does not pay for work no command asked for.

### Publishing so `plugins search` finds you

The host CLI's keyword goes in your `package.json` `keywords`. Without it, your package is invisible
to both `plugins list` and `plugins search`, no matter how correct the rest of the plugin is.

```json
{
  "name": "my-cli-plugin-git",
  "description": "git commands for my-cli",
  "keywords": ["my-cli-plugin", "git"],
  "main": "./cjs/index.js",
  "exports": { "import": "./esm/index.js", "require": "./cjs/index.js" }
}
```

Check the host CLI's docs for the exact keyword. If it is not documented, the CLI's own
`keywords` — or, failing that, its `name` — is the value to use.

Extra keywords are free, and worth adding: they describe *what* the plugin does, while the host
keyword describes *which CLI it plugs into*. Both matter to someone reading a `plugins search`
result list.

### Naming conventions

`plugins search` returns bare package names, with no descriptions. The name is the entire signal a
user gets, so let it carry the CLI it targets:

| Pattern | Example | Reads as |
| --- | --- | --- |
| `<cli>-plugin-<feature>` | `my-cli-plugin-git` | the git plugin for `my-cli` |
| `@scope/<cli>-plugin-<feature>` | `@acme/my-cli-plugin-deploy` | Acme's deploy plugin for `my-cli` |
| `<cli>-plugin` | `my-cli-plugin` | the one canonical plugin for `my-cli` |

Two things worth avoiding: a name that says nothing about the host CLI (`git-helper` in a
`my-cli plugins search` list is a guessing game), and a name that implies official status you do not
have. Publish under a scope if you want your own namespace.

Whatever you pick, keep the command names your plugin adds distinct from the host's. Commands are
merged into one namespace, and a collision is resolved by load order, not by anything a user can see.

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

Calling `activate` yourself with a stub `addCommand` also checks the half of the contract that only
the host normally exercises — that `activate` is exported, and that it registers what you expect.
