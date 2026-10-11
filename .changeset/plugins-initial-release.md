---
'@clibuilder/plugins': minor
---

First release of `@clibuilder/plugins`: plugin support for `clibuilder` CLIs, as a package a CLI opts into.

- `plugins(options?)`: an extension for `cli().use()` that adds the `plugins list` / `plugins search` group and loads plugins from `include` (packages the CLI ships), `dependencies` (opt-in: the project's direct dependencies carrying a keyword) and the `plugins` key in config, where `!name` excludes a package. Options: `keywords` (defaults to the CLI's name), `include`, `dependencies`, `config`, `command`.
- `pluginsCommand({ keywords })`: the command group alone.
- `loadPlugins`: imports and activates plugins, for hosts that load them their own way.
- `PluginActivationContext`: the type a plugin's `activate` receives, unchanged from `clibuilder` 11, so existing plugins load as they are.

`clibuilder` `^11.5.0 || ^12` is a peer dependency.
