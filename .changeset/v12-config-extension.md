---
'clibuilder': major
'@clibuilder/plugins': patch
'@clibuilder/codemod': minor
---

Config loading moved behind `.use(config())` from the new `clibuilder/config` subpath ([#692](https://github.com/clibuilder/clibuilder/issues/692)). A CLI without it contains no config loader, no find-up and no parsers. Upgrading from 11.5.0:

| Before | After |
| --- | --- |
| `cli({ name, version, config: true })` | `cli({ name, version }).use(config())` |
| `cli({ ..., config: 'other' })` | `cli({ ... }).use(config({ name: 'other' }))` |
| `import { resolveConfig } from 'clibuilder'` | `import { resolveConfig } from 'clibuilder/config'` |

- The `config` option of `cli()` is removed.
- `lookupConfig`, `resolveConfig`, `loadConfig`, `readConfigFile`, `getConfigFilenames`, `getConfigFormat`, `describeConfigSource` and the types `ConfigFormat`, `ConfigLoadResult`, `ConfigLookupResult` and `ConfigSource` are exported from `clibuilder/config` only.
- `.use(config())` adds `--show-config`, validates each command's `config` schema before `run()`, and gives `run()` the config as `this.config`. The output and the `invalid-config` errors are the same as in 11.
- A command that declares `config` must come after `.use(config())`: otherwise it is a type error. A command the type check cannot see, such as a sub-command, fails at runtime with an error naming `clibuilder/config`. In 11 such a command loaded the config by the CLI's name without `cli({ config })`.
- The config is resolved on the first `parse()`, not when `cli()` is called.
- With `@clibuilder/plugins`, add `.use(config())` before `.use(plugins())`: `plugins()` reads the `plugins` key from the config `config()` resolved.

`cli().use()` extensions can now do what `config()` does. `ExtensionContext` adds `shared`, values shared between extensions keyed by `defineKey()`, `addGlobalOption(name, entry, answer)` and `beforeRun(hook)`. `resolveConfig()` returns the config `config()` resolved. Extensions now run before the global options are resolved, and what they log is held until the logging flags apply.

`@clibuilder/codemod` replaces `cli({ config })` with `.use(config())`, adds the `clibuilder/config` import, and moves the config functions and types from `clibuilder` to `clibuilder/config`. A `config` value it cannot read is flagged with a `TODO(clibuilder-12)` comment.
