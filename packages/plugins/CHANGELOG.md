# @clibuilder/plugins

## 0.2.1

### Patch Changes

- 48fbee2: Include `CHANGELOG.md` in the published package.
- Updated dependencies [48fbee2]
  - clibuilder@12.1.1

## 0.2.0

### Minor Changes

- ecb0db4: `@clibuilder/plugins` is ESM-only: the CommonJS build in `cjs/` is gone.
  
  - `require('@clibuilder/plugins')` still works on Node.js 20.19 and later, the `engines` floor, through `require(esm)`.
  - The `exports` shape changed: the entry point is `{ types, default }` pointing at `esm/`, with no `import` or `require` condition, and the top-level `main` field is removed. `types` stays for older resolvers.
  - TypeScript reports error TS1479 (an ES module cannot be imported with `require`) in a CommonJS file compiled with `module: node16`, or with `module: nodenext` before TypeScript 5.8. The declarations were already ESM in 11.x, so this is not new, but it now matches what Node does. *Migrate:* use TypeScript 5.8 or later with `module: nodenext`. `module: commonjs` with `moduleResolution: node10` still resolves the root entry through the top-level `types` field.
  
  The published package unpacks to 91 kB in 42 files.
- 0e61d44: Requires `clibuilder` 12, which no longer loads plugins itself: `plugins()` is now the only way a CLI loads plugins and gets the `plugins list` / `plugins search` group. The peer range is `clibuilder ^12.0.0`. With `clibuilder` 11, keep `@clibuilder/plugins` 0.1.
  
  `plugins()` no longer marks its extension for `clibuilder` 11 to skip its own plugin loading, since that loading is gone.
- 4de665b: `plugins list` and `plugins search` follow clibuilder 12's output:
  
  - In the default `axi` output they return their report as the answer, which clibuilder prints once on stdout, instead of logging it: the names with a `help` line, prose under `--format text`, and an `empty` state naming the keywords. An unknown `--fields` value is a `CliError` with code `invalid-value` and exit code 2.
  - They drop their own `--format` option and read clibuilder's global `--format` as `this.format`, which takes the same values and defaults to `toon`. The command line is unchanged.
  - In `output: 'console'` they log the report in `this.format` and return the same values as in 0.1.

### Patch Changes

- f282d3e: Fix the grammar of the warning for a plugin that fails to load: it now ends `Please let the plugin author know about it.`
- 18b7725: The `plugins` commands declare their options with `t` instead of zod, which clibuilder 12 removes. Nothing changes for a caller.
- af37209: Config loading moved behind `.use(config())` from the new `clibuilder/config` subpath ([#692](https://github.com/clibuilder/clibuilder/issues/692)). A CLI without it contains no config loader, no find-up and no parsers. Upgrading from 11.5.0:
  
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
- 40d26cf: `testCommand(command, argv, options?)` takes one `options` object, `{ config, output, format }`, where it took `(command, argv, config?, options?)`. It also runs a `.default()` command. `@clibuilder/codemod` rewrites the old positional arguments.
  
  ```diff
  - await testCommand(cmd, 'cmd', { a: 1 }, { output: 'console' })
  + await testCommand(cmd, 'cmd', { config: { a: 1 }, output: 'console' })
  ```
  
  `mockPluginContext.Params` is now `mockPluginContext.Options`, and `loadPlugins.Context` is `loadPlugins.Options`. The old names stay as deprecated aliases, removed in clibuilder 13.
  
  `clibuilder/testing` adds `mockExtensionContext()`, which builds the `ExtensionContext` for testing an extension and captures the commands, global options, `beforeRun` hooks and shared state it adds.
- Updated dependencies [6809fee]
- Updated dependencies [b5ec612]
- Updated dependencies [31eec28]
- Updated dependencies [a05bdfa]
- Updated dependencies [ad6b788]
- Updated dependencies [20aaa9c]
- Updated dependencies [0e61d44]
- Updated dependencies [e1fb5ef]
- Updated dependencies [ac9c2fb]
- Updated dependencies [5dbee67]
- Updated dependencies [73adba2]
- Updated dependencies [af37209]
- Updated dependencies [8194d17]
- Updated dependencies [e395442]
- Updated dependencies [ecb0db4]
- Updated dependencies [fe84abc]
- Updated dependencies [18b7725]
- Updated dependencies [1d2d7a3]
- Updated dependencies [6f59df9]
- Updated dependencies [36d0a1d]
- Updated dependencies [40d26cf]
- Updated dependencies [b27bf6f]
  - clibuilder@12.0.0

## 0.1.0

### Minor Changes

- 16562e2: First release of `@clibuilder/plugins`: plugin support for `clibuilder` CLIs, as a package a CLI opts into.
  
  - `plugins(options?)`: an extension for `cli().use()` that adds the `plugins list` / `plugins search` group and loads plugins from `include` (packages the CLI ships), `dependencies` (opt-in: the project's direct dependencies carrying a keyword) and the `plugins` key in config, where `!name` excludes a package. Options: `keywords` (defaults to the CLI's name), `include`, `dependencies`, `config`, `command`.
  - `pluginsCommand({ keywords })`: the command group alone.
  - `loadPlugins`: imports and activates plugins, for hosts that load them their own way.
  - `PluginActivationContext`: the type a plugin's `activate` receives, unchanged from `clibuilder` 11, so existing plugins load as they are.
  
  `clibuilder` `^11.5.0 || ^12` is a peer dependency.

### Patch Changes

- Updated dependencies [8cf4fc8]
- Updated dependencies [16562e2]
- Updated dependencies [791e8ca]
  - clibuilder@11.5.0
