---
'clibuilder': minor
---

Add `cli().use(extension)`: a general hook that adds commands and registry entries before `parse()` picks the command to run. The extension receives an `ExtensionContext` with `host`, `cwd`, `ui`, `registry`, `addCommand` and `resolveConfig()`.

Extensions run in the order `use()` was called, each awaited before the next, on the first `parse()` that needs the command tree; their commands come after the CLI's own. A bare `--version` is answered without running them. `use()` makes `parse()` available.

This is the hook `@clibuilder/plugins` plugs into. When its `plugins()` extension is used, `clibuilder` skips its own config-driven plugin loading and its automatic `plugins` group, so nothing loads twice. Without it, plugin loading, `keywords` and the automatic `plugins` group work as before; they move out of core in v12.
