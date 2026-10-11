# @clibuilder/plugins

[![NPM version][npm-image]][npm-url]

Plugin loading and the `plugins list` / `plugins search` commands for [`clibuilder`][clibuilder] CLIs.

A CLI opts in with one call. Without it, a `clibuilder` CLI has no plugin system to learn.

## Install

```sh
npm install @clibuilder/plugins clibuilder
```

`clibuilder` `^12` is a peer dependency. With `clibuilder` 11, use `@clibuilder/plugins` 0.1. Node.js `>= 20.19`.

## Usage

```ts
import { cli } from 'clibuilder'
import { plugins } from '@clibuilder/plugins'

cli({ name: 'my-cli', version: '1.0.0', config: true })
  .use(plugins({ keywords: ['my-cli-plugin'] }))
  .parse(process.argv)
```

`plugins()` returns an extension for `cli().use()`. It adds the `plugins` command group and loads
plugins from up to three sources, in this order:

1. `include`: plugin packages the CLI author ships as the CLI's own dependencies. No user config is needed.
2. `dependencies`: the project's direct `dependencies` and `devDependencies` that carry one of
   `keywords`, in `package.json` order. Off by default.
3. `config`: the `plugins` key in the CLI's config, as in `clibuilder` 11. An entry starting with
   `!` excludes that package from the other sources.

A package named by more than one source loads once, at its first position.

| Option | Default | Meaning |
| --- | --- | --- |
| `keywords` | `[name]` of the CLI | the npm keywords `plugins list` and `plugins search` look for, and that `dependencies` matches |
| `include` | `[]` | plugin packages the CLI ships with |
| `dependencies` | `false` | load the project's direct dependencies that carry a keyword |
| `config` | `true` | read the `plugins` key from the CLI's config |
| `command` | `true` | add the `plugins list` / `plugins search` group |

`find-installed-packages` and `search-packages` are imported only when `plugins list` or
`plugins search` runs.

### Moving from `clibuilder` 11

In `clibuilder` 11, setting `config` or `keywords` loads the plugins named in config and adds the
`plugins` group. `clibuilder` 12 removes both, and the `keywords` option with them: a CLI loads
plugins only through `plugins()`. Add one call:

```diff
- cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })
+ cli({ name: 'my-cli', version: '1.0.0', config: true })
+   .use(plugins({ keywords: ['my-cli-plugin'] }))
```

### Writing a plugin

A plugin exports `activate(context)`. The context has the same shape as in `clibuilder` 11, so an
existing plugin loads unchanged. Import its type from here:

```ts
import type { PluginActivationContext } from '@clibuilder/plugins'

export function activate({ addCommand }: PluginActivationContext) {
  addCommand({ name: 'miku', description: 'vocaloid commands', run() {} })
}
```

## API

| Export | Description |
| --- | --- |
| `plugins(options?)` | The extension for `cli().use()` |
| `pluginsCommand({ keywords })` | The `plugins` command group alone, for a host that loads plugins its own way |
| `loadPlugins({ cwd, ui, registry, host }, names)` | Imports and activates the named plugins, returning their commands |
| `PluginActivationContext` | The type of the context a plugin's `activate` receives |

## Known gaps

- Under Yarn PnP, `plugins list` finds nothing ([#575][575]), and the `dependencies` source cannot
  read a dependency's `package.json`. One PnP-aware resolver is meant to fix both.

[575]: https://github.com/clibuilder/clibuilder/issues/575
[clibuilder]: https://github.com/clibuilder/clibuilder
[npm-image]: https://img.shields.io/npm/v/@clibuilder/plugins.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@clibuilder/plugins
