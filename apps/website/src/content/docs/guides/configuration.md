---
title: Configuration
description: Let your CLI read a config file — JSON, JSONC, YAML, cjs, or mjs — and validate it per command with any Standard Schema.
---

A CLI opts into config by adding the `config()` extension from the `clibuilder/config` subpath with
[`.use()`](/clibuilder/api/cli/#useextension). Config loads for the commands only. It does not load
plugins.

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'

cli({ name: 'app', version: '1.0.0' }).use(config())
```

`config()` derives the config name from the CLI name (`app`). Pass `name` to override it:

```ts
cli({ name: 'app', version: '1.0.0' }).use(config({ name: 'alt-config' }))
```

A CLI without `.use(config())` contains no config loader, no find-up and no parsers. `.use(config())`
gives the CLI the global [`--show-config`](#inspecting-the-resolved-config) option, the validation of
each command's `config` schema before `run()`, and `this.config`. The config is resolved on the first
`parse()`, not when `cli()` is called.

A command that declares `config` needs `.use(config())` on its CLI. Call `.use(config())` before
`.command()` and `.default()`: on a CLI without it, a command with `config` is a type error, and at
run time it fails with:

```
Error: command 'x' declares config, but the cli does not load config. Add .use(config()) from 'clibuilder/config' to the cli.
```

## Where the config is found

Given a config name of `app`, these filenames are searched, in order, walking up from the current
working directory:

- `app`, `app.cjs`, `app.mjs`, `app.js`, `app.json`, `app.jsonc`, `app.yml`, `app.yaml`
- `apprc.cjs`, `apprc.mjs`, `apprc.js`, `apprc.json`, `apprc.jsonc`, `apprc.yml`, `apprc.yaml`, `apprc`

Each also matches with a leading dot — `.apprc.json`, `.app.yaml`, and so on. (If your config name
already starts with `.`, the dotted variants are skipped.)

If none of those exist, the nearest `package.json` is checked for a top-level key matching the config
name:

```json
{
  "name": "my-project",
  "app": { "presets": "recommended" }
}
```

If nothing is found at all, the CLI warns and `this.config` is `undefined`.

## Declaring what a command needs

Config is validated **per command**, against the schema that command declares. A command with no
`config` schema doesn't trigger a load and doesn't get one.

`config` takes any [Standard Schema](https://standardschema.dev): zod 3.24 or later, zod 4, valibot
or arktype. Install the library as your own dependency and import it from there. `clibuilder` does
not install one for you.

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'
import { z } from 'zod'

cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .default({
    config: z.object({ presets: z.string() }),
    run() {
      // this.config: { presets: string }
      this.ui.info(`presets: ${this.config.presets}`)
    }
  })
  .parse(process.argv)
```

`this.config` is the schema's output, so downstream code sees the real shape. Defaults are filled in,
transforms are applied, and a zod `z.object()` strips keys it does not declare. A schema whose
`validate` returns a promise is awaited.

The same works with valibot:

```ts
import { cli } from 'clibuilder'
import { config } from 'clibuilder/config'
import * as v from 'valibot'

cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .default({
    config: v.object({ presets: v.string(), port: v.optional(v.number(), 3000) }),
    run() {
      // this.config: { presets: string; port: number }
      this.ui.info(`presets: ${this.config.presets} on ${this.config.port}`)
    }
  })
  .parse(process.argv)
```

:::note[Since 12.0.0]
In `clibuilder` 11.5.0 the schema comes from `z`, re-exported by `clibuilder`, and the command gets
the config as it was loaded, so a `.default()` or `.transform()` had no effect. See
[zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t).
:::

Different commands can ask for different slices of the same file — each declares only what it uses,
and each validates independently.

```ts
cli({ name: 'app', version: '1.0.0' })
  .use(config())
  .command({
    name: 'build',
    description: 'build the project',
    config: z.object({ outDir: z.string() }),
    run() {
      this.ui.info(`building into ${this.config.outDir}`)
    }
  })
  .command({
    name: 'serve',
    description: 'serve the project',
    config: z.object({ port: z.number() }),
    run() {
      this.ui.info(`serving on ${this.config.port}`)
    }
  })
```

## When validation fails

The CLI prints each issue's message under the dotted path of the value that failed, such as
`server.port`, and then the command's help message. An issue about the config as a whole is printed
under `(config)`. The command does not run.

```
config fails validation:
  presets: Required
```

Mark fields you don't want to be mandatory as optional, or give them a default, in the schema.

### In help

The `Config:` section of a command's help is generated only from the schema's JSON Schema, which a
Standard Schema exposes as `~standard.jsonSchema`. Zod 4, valibot (through its converter) and arktype
provide it:

```
Config:
{ presets: string, port?: number }
```

Help shows the shape a config file is written in, so a field with a default is optional. A zod 3
schema has no JSON Schema, so its `Config:` section is left out.

## File formats

| Extension | Format |
| --- | --- |
| `.json`, `.jsonc` | JSON with comments and trailing commas |
| `.yml`, `.yaml` | YAML. Needs the optional peer `js-yaml` |
| `.cjs` | CommonJS module — its export is the config |
| `.mjs`, `.js` | ES module — its default export is the config |
| none | inferred from the content — JSONC, then YAML, then module |

YAML needs `js-yaml`, an optional peer dependency. Install it with `npm install js-yaml` in a CLI
whose users write a `.yaml` or `.yml` config. Without it, reading a YAML config fails with a
`CliError` whose code is `missing-peer-dependency`.

The format comes from the extension, so a `.json` file that is not valid JSON is reported as a parse
error against that file rather than being silently retried as YAML.

### Comments and trailing commas

`.json` and `.jsonc` are both parsed as [JSONC], so comments and trailing commas are allowed in
either. Extension-less files such as `.apprc` get the same treatment when their content looks like
JSON.

```jsonc
{
  // the preset to build with
  "presets": "recommended",
  "plugins": ["my-cli-plugin"],
}
```

Comment-like sequences inside strings stay part of the string — `"http://example.com"` is not
truncated at the `//`.

The executable formats are the escape hatch for config that has to be computed:

```js
// app.mjs
export default {
  presets: process.env.CI ? 'ci' : 'recommended'
}
```

[JSONC]: https://code.visualstudio.com/docs/languages/json#_json-with-comments

## Inspecting the resolved config

A CLI with `.use(config())` gets a `--show-config` option, which prints the config it resolved and the
file it came from. It is an answer on stdout and follows `--format`, `toon` by default:

```sh
$ app --show-config
source: file
path: /home/me/project/app.jsonc
config:
  presets: recommended
```

`--format json` gives the same fields as JSON, and `--format text` gives the lines as a person reads
them:

```sh
$ app --show-config --format text
config: /home/me/project/app.jsonc
{
  "presets": "recommended"
}
```

When the config came from `package.json`, `source` is `package.json` and `property` names the key
that was read. Under `--format text` the property is named after the path:

```sh
config: /home/me/project/package.json (property "app")
```

And when nothing matched, `source` is `none` and `config` is `null`. Under `--format text`:

```sh
config: not found
```

The warning listing every filename that was searched for is a diagnostic on stderr, as on any
invocation that finds no config.

With `output: 'console'`, `--show-config` writes the `text` lines through the CLI's `ui`, on stdout,
whatever the `--format`, as in 11.5.0.

## Reading the config yourself

`clibuilder/config` also exports the functions the CLI uses to find and read config, such as `lookupConfig()` and `resolveConfig()`. See [`clibuilder/config`](/clibuilder/api/config/).

## The `plugins` key

:::note[Since 12.0.0]
In `clibuilder` 11, `plugins` is reserved by `clibuilder` itself and lists the packages whose
commands get loaded. In `clibuilder` 12 core no longer reserves it and loads nothing.
[`plugins()`](/clibuilder/packages/plugins/) from `@clibuilder/plugins` reads it from the config
`.use(config())` resolved, so add `config()` before `plugins()`. If the config lists plugins and the CLI loads none, it warns once.
:::

A CLI that calls `.use(plugins())` reads a `plugins` key that lists the packages whose commands get
loaded. See [Plugins](/clibuilder/guides/plugins/).

```json
{
  "plugins": ["my-cli-plugin"],
  "presets": "recommended"
}
```

You do not need to declare `plugins` in a command's schema — but if your schema is a strict object
that rejects unknown keys, remember it is there. Plugins are loaded before a command's schema runs, so
a schema that strips unknown keys does not stop them loading.
