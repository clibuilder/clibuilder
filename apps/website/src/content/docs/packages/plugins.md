---
title: "@clibuilder/plugins"
description: "Plugin loading and the plugins command group, as a package a clibuilder CLI opts into."
---

`@clibuilder/plugins` adds plugin support to a `clibuilder` CLI. It loads plugin packages, and adds
the `plugins list` and `plugins search` commands. A CLI opts in with one call to
[`.use()`](/clibuilder/api/cli/#useextension). A CLI that does not call it has no plugin system to
learn.

:::caution[Unreleased]
`@clibuilder/plugins` 0.1.0 is on `main` but not published to npm yet. It needs `clibuilder` 11.5.0,
which is also unreleased. Until both are published, use the
[plugin support built into `clibuilder` 11](/clibuilder/guides/plugins/).
:::

## Install

Once 0.1.0 is published:

```sh
npm install @clibuilder/plugins clibuilder
```

`clibuilder` `^11.5.0 || ^12` is a peer dependency. Node.js 20.19 or newer is required.

## Usage

```ts
import { cli } from 'clibuilder'
import { plugins } from '@clibuilder/plugins'

cli({ name: 'my-cli', version: '1.0.0', config: true })
  .use(plugins({ keywords: ['my-cli-plugin'] }))
  .parse(process.argv)
```

`plugins()` returns an extension for `cli().use()`. When it runs, it adds the `plugins` command
group and loads plugins from up to three sources.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `keywords` | `[name]` of the CLI | The npm keywords that `plugins list` and `plugins search` look for, and that the `dependencies` source matches |
| `include` | `[]` | Plugin packages the CLI ships as its own dependencies |
| `dependencies` | `false` | Load the project's direct dependencies that carry one of `keywords` |
| `config` | `true` | Read the `plugins` key from the CLI's config |
| `command` | `true` | Add the `plugins list` / `plugins search` group |

See [Choosing a keywords namespace](/clibuilder/guides/plugins/#choosing-a-keywords-namespace) for
why `<cli-name>-plugin` is a better keyword than the default.

## Plugin sources

Plugins load from these sources, in this order:

1. **`include`**: packages the CLI author lists in code. The user needs no config.
2. **`dependencies`**: when turned on, the packages under `dependencies` and `devDependencies` in
   the nearest `package.json` that carry one of `keywords`, in `package.json` order. Packages
   installed by other packages are never checked. The option is off by default, because a
   dependency that adds the keyword in a later version would start adding commands without the
   user doing anything.
3. **`config`**: the `plugins` array in the CLI's [config file](/clibuilder/guides/configuration/),
   as in `clibuilder` 11. An entry that starts with `!` excludes that package from the other
   sources.

```json
{
  "plugins": ["my-cli-plugin-git", "!my-cli-plugin-deploy"]
}
```

A package named by more than one source loads once, at its first position. A package that fails to
import, or exports no `activate`, is skipped with a warning.

`find-installed-packages` and `search-packages` are imported only when `plugins list` or
`plugins search` runs, so a CLI that does not run them does not load them.

## Exports

| Export | Purpose |
| --- | --- |
| `plugins(options?)` | The extension for `cli().use()` |
| `pluginsCommand({ keywords })` | The `plugins` command group alone, for a CLI that loads plugins its own way |
| `loadPlugins({ cwd, ui, registry, host }, names)` | Imports and activates the named plugins, and returns the commands they add |
| `PluginActivationContext` | The type of the context a plugin's `activate` receives |

`pluginsCommand` adds the commands without loading anything:

```ts
import { cli } from 'clibuilder'
import { pluginsCommand } from '@clibuilder/plugins'

cli({ name: 'my-cli', version: '1.0.0' })
  .command(pluginsCommand({ keywords: ['my-cli-plugin'] }))
  .parse(process.argv)
```

## Writing a plugin

A plugin exports `activate(context)`. The context has the same shape as in `clibuilder` 11, so an
existing plugin loads unchanged. Import the type from `@clibuilder/plugins`:

```ts
import type { PluginActivationContext } from '@clibuilder/plugins'

export function activate({ addCommand }: PluginActivationContext) {
  addCommand({ name: 'miku', description: 'vocaloid commands', run() {} })
}
```

The [Plugins guide](/clibuilder/guides/plugins/#writing-a-plugin) covers the rest: the registry,
publishing, naming and testing.

## Moving from the plugin support in `clibuilder` 11

In `clibuilder` 11, setting `config` or `keywords` loads the plugins named in config and adds the
`plugins` group. That keeps working through every 11.x release.

When a CLI calls `.use(plugins())`, `clibuilder` 11.5.0 and later skip their own config-driven
plugin loading and their own `plugins` group, so nothing loads twice. You can switch a CLI before
v12:

```diff
- cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })
+ cli({ name: 'my-cli', version: '1.0.0', config: true })
+   .use(plugins({ keywords: ['my-cli-plugin'] }))
```

**Planned for v12:** `clibuilder` 12 removes its own plugin loading, the `keywords` option,
`this.keywords` and the automatic `plugins` group. After that, `@clibuilder/plugins` is the only way
to load plugins. The plugin registry (`defineKey`, `defineCollectionKey` and `this.registry`) stays
in core. See
[section 9 of the slim-dependencies RFC](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#9-amendment-move-all-plugin-support-out-of-core)
and the [v12 roadmap](/clibuilder/roadmap/v12/).

## Known gaps

Under Yarn PnP, `plugins list` finds nothing
([#575](https://github.com/clibuilder/clibuilder/issues/575)), and the `dependencies` source cannot
read a dependency's `package.json`.
