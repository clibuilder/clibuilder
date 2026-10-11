---
name: plugins
status: draft
project-path: packages/plugins
---

# @clibuilder/plugins

`@clibuilder/plugins` holds plugin support for `clibuilder` CLIs: loading plugin
packages, and the `plugins list` / `plugins search` commands. A CLI opts in with
`cli().use(plugins())`, through the extension hook core provides
(`packages/clibuilder` execution UC7).

It lives apart from `clibuilder` so core is the parser, help, config and
`run()`, with no plugin system a CLI author did not ask for, and so plugin needs
(sources, trust rules, discovery) can change without a core major. The design is
[slim-dependencies RFC section 9](../../../../docs/rfcs/slim-dependencies.md#9-amendment-move-all-plugin-support-out-of-core).
`clibuilder` is a peer dependency.

During `clibuilder` 11 the same behaviour also lives in core; the copies there
(`src/plugins/load.ts`, `src/drivers/resolve_plugin.ts`,
`src/builtin/plugin_commands/`) are removed in v12. Their behaviour is specified
by `packages/clibuilder`'s `plugins/` and `builtin-commands/` nodes, and this
package keeps it unchanged.

## Placement map

Strategy: **capability-first**.

| Kind of work | Home |
| --- | --- |
| The `plugins()` extension: its options, its plugin sources, and handing the result to core | `extension/` |
| Activating a plugin and its context | `packages/clibuilder` `plugins/` — unchanged here |
| What `plugins list` and `plugins search` report | `packages/clibuilder` `builtin-commands/` — unchanged here |
| Package entry points, supported runtimes, and published artifacts | `distribution/` |

**Non-goals.** PnP-aware resolution (#575) is not here yet; see `extension/`.
