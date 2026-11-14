# Config and plugins

Read this when a command reads a config file, or when the CLI loads plugins.

## Config

Config is opt-in. Add the extension before the commands, and declare a Standard Schema (zod, valibot or arktype, from your own dependencies) on each command that reads config:

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'
import { z } from 'zod'

cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .command({
    name: 'build',
    description: 'build',
    config: z.object({ out: z.string() }),
    run() { return this.config }
  })
  .parse(process.argv)
```

- It finds `app.json`, `.apprc`, `app.yaml` and similar files upward from the working directory, or an `app` key in `package.json`.
- A command with `config` on a CLI without `.use(config())` is a type error, and throws at run time.
- A config that fails validation exits `1` and prints the help.
- `this.config` is `undefined` on a command that declares no `config`.
- `.use(config())` adds the global `--show-config` option, which prints the config it resolved.
- In tests, pass `{ config: {...} }` to `testCommand` in place of the file.

## Plugins

Install `@clibuilder/plugins`. Add `config()` before `plugins()`, because `plugins()` reads the config file's `plugins` array:

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'
import { plugins } from '@clibuilder/plugins'

cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .use(plugins({ keywords: ['app-plugin'] }))
  .parse(process.argv)
```

Pick a namespaced keyword such as `app-plugin`. The CLI name alone matches unrelated npm packages, and it is the default when `keywords` is left out.

A plugin is an ESM package that exports `activate`:

```ts
import { command } from 'clibuilder'
import type { PluginActivationContext } from '@clibuilder/plugins'

export function activate({ addCommand }: PluginActivationContext) {
  addCommand(command({ name: 'hello', description: 'say hello', run() { return 'hello' } }))
}
```

Users list plugin packages in the config file's `plugins` array. A package that fails to import, or exports no `activate`, is skipped with a warning.

- Plugins guide: https://clibuilder.github.io/clibuilder/guides/plugins/
- Configuration guide: https://clibuilder.github.io/clibuilder/guides/configuration/
