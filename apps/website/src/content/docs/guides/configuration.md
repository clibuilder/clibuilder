---
title: Configuration
description: Let your CLI read a config file — JSON, YAML, cjs, or mjs — and validate it per command with zod.
---

A CLI opts into config by declaring `config` on [`cli()`](/clibuilder/api/cli/). Doing so also makes
`.parse()` available immediately, since a config-driven CLI can get all of its commands from
[plugins](/clibuilder/guides/plugins/).

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

- `app`, `app.cjs`, `app.mjs`, `app.js`, `app.json`, `app.yml`, `app.yaml`
- `apprc.cjs`, `apprc.mjs`, `apprc.js`, `apprc.json`, `apprc.yml`, `apprc.yaml`, `apprc`

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

Config is validated **per command**, against the zod schema that command declares. A command with no
`config` schema doesn't trigger a load and doesn't get one.

```ts
import { cli, z } from 'clibuilder'

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

`this.config` is typed by `z.infer<>` of the schema you declared, so downstream code sees the real
shape.

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

The CLI prints each field's error and then the command's help message, and does not run the command:

```
config fails validation:
  presets: Required
```

Use `z.optional()` or `.default()` in the schema for fields you don't want to be mandatory.

## File formats

| Extension | Format |
| --- | --- |
| `.json`, none | JSON |
| `.yml`, `.yaml` | YAML |
| `.cjs` | CommonJS module — its export is the config |
| `.mjs`, `.js` | ES module — its default export is the config |

The executable formats are the escape hatch for config that has to be computed:

```js
// app.mjs
export default {
  presets: process.env.CI ? 'ci' : 'recommended'
}
```

## The `plugins` key

One key is reserved by `clibuilder` itself: `plugins`. It lists the packages whose commands get
loaded into the CLI. See [Plugins](/clibuilder/guides/plugins/).

```json
{
  "plugins": ["my-cli-plugin"],
  "presets": "recommended"
}
```

You do not need to declare `plugins` in a command's schema — but if your schema is a strict object
that rejects unknown keys, remember it is there.
