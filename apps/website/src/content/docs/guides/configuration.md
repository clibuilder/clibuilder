---
title: Configuration
description: Let your CLI read a config file — JSON, JSONC, YAML, cjs, or mjs — and validate it per command with any Standard Schema.
---

A CLI opts into config by declaring `config` on [`cli()`](/clibuilder/api/cli/). Doing so also makes
`.parse()` available immediately, since a config-driven CLI can get all of its commands from an
extension such as [plugins](/clibuilder/guides/plugins/). Config loads for the commands only. It
does not load plugins.

```ts
cli({ name: 'app', version: '1.0.0', config: true })
```

`config: true` derives the config name from the CLI name (`app`). Pass a string to override it:

```ts
cli({ name: 'app', version: '1.0.0', config: 'alt-config.json' })
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
import { z } from 'zod'

cli({ name: 'app', version: '1.0.0', config: true })
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
import * as v from 'valibot'

cli({ name: 'app', version: '1.0.0', config: true })
  .default({
    config: v.object({ presets: v.string(), port: v.optional(v.number(), 3000) }),
    run() {
      // this.config: { presets: string; port: number }
      this.ui.info(`presets: ${this.config.presets} on ${this.config.port}`)
    }
  })
  .parse(process.argv)
```

:::note[v12, unreleased]
In `clibuilder` 11.5.0 the schema comes from `z`, re-exported by `clibuilder`, and the command gets
the config as it was loaded, so a `.default()` or `.transform()` had no effect. See
[zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t).
:::

Different commands can ask for different slices of the same file — each declares only what it uses,
and each validates independently.

```ts
cli({ name: 'app', version: '1.0.0', config: true })
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

A CLI that accepts config gets a `--show-config` option, which prints the config it resolved and the
file it came from:

```sh
$ app --show-config
config: /home/me/project/app.jsonc
{
  "presets": "recommended"
}
```

When the config came from `package.json`, the property is named too:

```sh
config: /home/me/project/package.json (property "app")
```

And when nothing matched, `--show-config` says so, after the warning listing every filename that was
searched for:

```sh
config: not found
```

**v12, unreleased:** `--show-config` writes these lines through the CLI's `ui`. With
`output: 'axi'`, the default, every `ui` line is a diagnostic on stderr, so they land on stderr.
With `output: 'console'`, and in 11.5.0, they are on stdout.

## Reading the config yourself

`clibuilder` exports its config resolution, so a plugin or a tool can ask the same questions the CLI
asks — including *where* an answer came from.

```ts
import { lookupConfig, resolveConfig } from 'clibuilder'

// where would the config come from? (no file is read)
const { source, candidates } = lookupConfig({ cwd: process.cwd() }, 'app')

// the config plus its provenance
const { config } = await resolveConfig({ cwd: process.cwd(), ui }, 'app')
```

`source` is one of:

| `source.type` | Fields | Meaning |
| --- | --- | --- |
| `file` | `path`, `format` | a config file matched |
| `package.json` | `path`, `property` | the `package.json` fallback was used |
| `none` | — | nothing matched |

`candidates` is every filename that was searched for, in priority order.

Also exported: `loadConfig` (the config value alone), `readConfigFile` (parse one known file),
`getConfigFilenames`, `getConfigFormat`, and `describeConfigSource` (render a `source` as one line).

:::note
These are read-only. Writing config back to disk is not supported yet — see
[#488](https://github.com/clibuilder/clibuilder/issues/488).
:::

## The `plugins` key

:::caution[Unreleased]
In `clibuilder` 11, `plugins` is reserved by `clibuilder` itself and lists the packages whose
commands get loaded. In `clibuilder` 12 (unreleased) core no longer reserves it and loads nothing.
[`plugins()`](/clibuilder/packages/plugins/) from `@clibuilder/plugins` reads it from the resolved
config. If the config lists plugins and the CLI loads none, it warns once.
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
