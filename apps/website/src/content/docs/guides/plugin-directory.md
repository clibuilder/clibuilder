---
title: Plugin Directory
description: "Let your CLI's users find and install its plugins: a plugins install command in the terminal, and a plugins page on your CLI's website."
---

Your CLI's plugin directory is every npm package that carries your CLI's plugin keyword. It needs no
server and no submissions. The npm registry already holds it, and one keyword query reads it.

This guide shows two ways to put that directory in front of your users:

1. **In the terminal**, as a `plugins install` command next to the built-in `plugins list` and `plugins search`.
2. **On the web**, as a plugins page on your CLI's own site, built from the same query.

It assumes you have read [Plugins](/clibuilder/guides/plugins/). That page covers how
[`@clibuilder/plugins`](/clibuilder/packages/plugins/) loads plugins from the config, how to choose a
keyword, and what `plugins list` and `plugins search` report.

## In the terminal: add `plugins install`

`plugins search` finds a plugin, and the user then installs it and adds it to the config by hand.
A `plugins install` command does the first of those steps and states the second exactly.

The example below is the one in
[`test-apps/test-cli-esm`](https://github.com/clibuilder/clibuilder/tree/main/test-apps/test-cli-esm),
where it is tested.

### Extend the `plugins` group

Commands nest, so you add `install` as one more sub-command of `plugins`. Build the group from
`pluginsCommand()`, which returns the built-in group with `list` and `search`:

```ts
import { command } from 'clibuilder'
import { pluginsCommand } from '@clibuilder/plugins'

export function pluginsGroup({ name, keywords }: { name: string; keywords: string[] }) {
  const builtin = pluginsCommand({ keywords })
  return command({ ...builtin, commands: [...builtin.commands!, installPluginCommand(name)] })
}
```

Then add the group to your CLI, and pass `command: false` to `plugins()`:

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'
import { plugins } from '@clibuilder/plugins'

const keywords = ['my-cli-plugin']

cli({ name: 'my-cli', version: '1.0.0' })
  .use(config())
  .command(pluginsGroup({ name: 'my-cli', keywords }))
  .use(plugins({ keywords, command: false }))
  .parse(process.argv)
```

`command: false` matters. `plugins()` adds its own `plugins` group otherwise, and a second command with
the same name is not merged into the first: the CLI would list `plugins` twice. With it, `plugins()`
still loads the plugins the config names.

```sh
$ my-cli plugins -h --format text

Usage: my-cli plugins <command>

  Commands related to the plugins of the cli

Commands:
  list (ls), search, install
```

### Write the `install` command

`install` runs the project's package manager, then reports what to add to the config. It takes the
package manager and the config lookup from its `context`, so a test can replace them:

```ts
import { CliError, command, ref, result } from 'clibuilder'
import { lookupConfig } from 'clibuilder/config'

export function installPluginCommand(cliName: string) {
  return command({
    name: 'install',
    description: "Install a plugin with the project's package manager",
    arguments: [{ name: 'plugin', description: 'the plugin package, with an optional @version' }],
    context: {
      detectPackageManager,
      runPackageManager,
      findConfig: (cwd: string) => lookupConfig({ cwd }, cliName).source
    },
    async run({ plugin }) {
      const name = packageName(plugin)
      const packageManager = this.context.detectPackageManager(this.cwd)
      const code = await this.context.runPackageManager(packageManager, ['add', plugin], this.cwd)
      if (code !== 0) {
        throw new CliError(`${packageManager} add ${plugin} failed with exit code ${code}`, {
          code: 'install-failed',
          details: { plugin, packageManager },
          help: `Run \`${packageManager} add ${plugin}\` to see the full error`
        })
      }
      const configured: string[] = Array.isArray(this.config?.plugins) ? this.config.plugins : []
      if (configured.includes(name)) {
        return result(
          { installed: name, packageManager, config: 'already lists it' },
          { help: [ref('plugins list', {}, 'see the installed plugins')] }
        )
      }
      const source = this.context.findConfig(this.cwd)
      const plugins = [...configured, name]
      return result(
        { installed: name, packageManager, config: describeConfig(source, cliName), plugins },
        { help: addToConfig(source, cliName, name, plugins) }
      )
    }
  })
}
```

The helpers it calls are short. The
[example file](https://github.com/clibuilder/clibuilder/blob/main/test-apps/test-cli-esm/plugins-install.mjs)
has them in full:

- `packageName()` reads the name out of a `name@version` spec. It throws a usage error (`invalid-value`,
  exit `2`) for anything else, so a spec such as `pkg;rm` never reaches the package manager.
- `detectPackageManager()` picks `pnpm`, `yarn` or `bun` by the lockfile in the project, and `npm` when
  there is none. All four accept `add <package>`.
- `runPackageManager()` spawns it with its stdout and stderr both sent to stderr. Stdout carries
  the command's answer, as the [AXI conventions](/clibuilder/getting-started/axi/) require.
- `describeConfig()` and `addToConfig()` name the config file, or the file to create when there is none.

The answer gives the config's `plugins` array with the new plugin added:

```sh
$ my-cli plugins install my-cli-plugin-git
installed: my-cli-plugin-git
packageManager: pnpm
config: /project/.my-clirc.json
plugins[2]: my-cli-plugin,my-cli-plugin-git
help[1]: "Add \"my-cli-plugin-git\" to the `plugins` array in /project/.my-clirc.json to load it"
```

When the config already lists the plugin, the next step is `plugins list` instead. The `ref()` there is
checked against the command tree, so the suggestion always names a command that exists.

### Why `install` does not edit the config

`install` reports the change and leaves the config to the user. There are two reasons:

- **Activation stays deliberate.** Installing a package does not load it. A user adds it to `plugins`
  on purpose, as [Listing plugins in config](/clibuilder/guides/plugins/#listing-plugins-in-config) explains.
- **`clibuilder/config` reads config and does not write it.** The config can be JSON, YAML, a JavaScript
  module or a `package.json` property. Rewriting each of those safely is its own feature. See
  [Resolving config yourself](/clibuilder/api/config/#resolving-config-yourself).

A CLI that controls its config format can write the file itself. The answer's `plugins` field is the
array to write.

### Test it without the network

Replace the `context` of `install` and run the group with
[`testCommand()`](/clibuilder/api/test-command/). Nothing is installed and no file is read:

```ts
import { testCommand } from 'clibuilder/testing'

const calls: string[][] = []
const group = pluginsGroup({ name: 'my-cli', keywords: ['my-cli-plugin'] })
const commands = group.commands!.map((c) =>
  c.name === 'install'
    ? {
        ...c,
        context: {
          ...c.context,
          detectPackageManager: () => 'pnpm',
          runPackageManager: (pm: string, args: string[]) => (calls.push([pm, ...args]), Promise.resolve(0)),
          findConfig: () => ({ type: 'file', path: '/project/.my-clirc.json', format: 'jsonc' })
        }
      }
    : c
)

const { result } = await testCommand({ ...group, commands }, 'plugins install my-cli-plugin-git')
expect(calls).toEqual([['pnpm', 'add', 'my-cli-plugin-git']])
expect(result.plugins).toEqual(['my-cli-plugin-git'])
```

`plugins search` works the same way: replace its `context.searchByKeywords`. The tests of
`@clibuilder/plugins` do that.

## On the web: a plugins page

A plugins page on your CLI's site (such as `my-cli.dev/plugins`) runs the same keyword query against
the npm registry and renders the result.

### The query

The registry's search endpoint takes a `keywords:` qualifier:

```txt
GET https://registry.npmjs.org/-/v1/search?text=keywords:my-cli-plugin&size=250&from=0
```

Three details decide whether the page agrees with `plugins search`:

- **Query one keyword at a time.** `plugins search` does that, and unions the results. A package
  matches if it carries any of your keywords.
- **Filter on the exact keyword.** The `keywords:` qualifier is not a strict match. Keep a package only
  when its `keywords` array contains the keyword.
- **Page through the results.** The endpoint returns at most 250 objects per request. Raise `from`
  until it reaches `total`.

This function does all three:

```ts
export type Plugin = { name: string; version: string; description?: string; npm: string }

export async function searchPlugins(keywords: string[]): Promise<Plugin[]> {
  const found = new Map<string, Plugin>()
  for (const keyword of keywords) {
    for (let from = 0; ; from += 250) {
      const text = encodeURIComponent(`keywords:${keyword}`)
      const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${text}&size=250&from=${from}`)
      if (!response.ok) throw new Error(`npm registry search failed: ${response.status}`)
      const { objects, total } = await response.json()
      for (const { package: pkg } of objects) {
        if (!pkg.keywords?.includes(keyword) || found.has(pkg.name)) continue
        found.set(pkg.name, { name: pkg.name, version: pkg.version, description: pkg.description, npm: pkg.links.npm })
      }
      if (objects.length === 0 || from + objects.length >= total) break
    }
  }
  return [...found.values()]
}
```

### Render the page

On a [Starlight](https://starlight.astro.build/) site, call `searchPlugins()` in a page's frontmatter
and wrap the list in `StarlightPage`:

```astro
---
// src/pages/plugins.astro
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro'
import { searchPlugins } from '../search-plugins'

const plugins = await searchPlugins(['my-cli-plugin'])
---

<StarlightPage frontmatter={{ title: 'Plugins' }}>
  {plugins.length === 0 ? (
    <p>No package carries the <code>my-cli-plugin</code> keyword yet.</p>
  ) : (
    <ul>
      {plugins.map((p) => (
        <li>
          <a href={p.npm}>{p.name}</a> {p.version}: {p.description}
          <pre><code>my-cli plugins install {p.name}</code></pre>
        </li>
      ))}
    </ul>
  )}
</StarlightPage>
```

The page runs the query when the site builds, so it lists the plugins published before the last
deploy. Rebuild on a schedule to keep it current. The registry also answers a browser's request: its
search endpoint sends `Access-Control-Allow-Origin: *`. To list plugins as of the visit, call
`searchPlugins()` from a client-side script instead.

Show the install line with each entry. It is the command from the terminal section, so a reader can
copy it straight into their shell.

## Why there is no global clibuilder plugin directory

`clibuilder` does not run a marketplace that lists the plugins of every CLI built with it. A global list
does not fit how `clibuilder` plugins work.

A marketplace fits a single host application with one set of users, where every plugin listed is
relevant to every visitor. `clibuilder` is not that host. It is a library for building hosts. A
`clibuilder` plugin targets one CLI: that CLI's config activates it, and that CLI's keyword finds it.
The users of another CLI cannot load it.

A global list would therefore gather the plugins of many unrelated CLIs. Each entry would matter only
to the users of one CLI, and most of them never visit the `clibuilder` site. Running the list would
still mean taking submissions, moderating them, removing spam and dead links, and keeping it in sync
with the registry. npm keyword search already answers the question, per CLI, for free.

**Revisit if** `clibuilder` ships a first-party host CLI that itself takes plugins. A single host with
real users is the case a marketplace fits. The directory on this page is generated from a keyword query,
so building a marketplace later costs almost nothing to migrate to. Nothing needs to be built now to
keep that option open.
