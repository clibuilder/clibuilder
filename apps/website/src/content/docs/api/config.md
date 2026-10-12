---
title: clibuilder/config
description: The config() extension and the functions that find and read a config file.
---

```ts
import { config } from 'clibuilder/config'
```

Since 12.0.0, a CLI that reads config adds `config()` with [`.use()`](/clibuilder/api/cli/#useextension). The
[Configuration guide](/clibuilder/guides/configuration/) covers what it does for a CLI. This page lists the exports.

## `config(options?)`

```ts
cli({ name: 'app', version: '1.0.0' }).use(config())
```

| Option | Default | Purpose |
| --- | --- | --- |
| `name` | the CLI's name | The name config files are looked up by, such as `<name>.json` or `.<name>rc`, and the `package.json` property |

It returns a `ConfigExtension`, a type exported from `clibuilder`. `cli().use()` reads that type to allow a command's `config` schema
and to type `this.config`, so a command that declares `config` on a CLI without it is a type error.

## Resolving config yourself

These are read-only. Writing config back to disk is not supported; see
[#488](https://github.com/clibuilder/clibuilder/issues/488).

```ts
import { lookupConfig, resolveConfig } from 'clibuilder/config'

// where would the config come from? (no file is read)
const { source, candidates } = lookupConfig({ cwd: process.cwd() }, 'app')

// the config plus its provenance
const { config } = await resolveConfig({ cwd: process.cwd(), ui }, 'app')
```

| Export | Purpose |
| --- | --- |
| `lookupConfig({ cwd }, name)` | Find where the config would be read from, without reading it. Returns a `ConfigLookupResult` |
| `resolveConfig({ cwd, ui }, name)` | Load the config with its `source` and `candidates`. Returns a `ConfigLoadResult` |
| `loadConfig({ cwd, ui }, name)` | The config value alone |
| `readConfigFile(path)` | Parse one known file, by its extension; an extension-less file is detected by content |
| `getConfigFilenames(name)` | The filenames searched for, in priority order |
| `getConfigFormat(path)` | The `ConfigFormat` of a path |
| `describeConfigSource(source)` | A `ConfigSource` as one line |

## Types

| Type | Shape |
| --- | --- |
| `ConfigSource` | `{ type: 'file', path, format }`, `{ type: 'package.json', path, property }` or `{ type: 'none' }` |
| `ConfigFormat` | `'jsonc' \| 'yaml' \| 'module' \| 'unknown'` |
| `ConfigLookupResult` | `{ source, candidates }`, where `candidates` is every filename searched for at each directory up to the root |
| `ConfigLoadResult` | `ConfigLookupResult & { config }` |
| `ConfigExtension` | What `config()` returns, exported from `clibuilder` |
| `config.Options` | The options of `config()` |

`ConfigSource` is `none` when nothing matched, which differs from a file that exists and holds `undefined`.
