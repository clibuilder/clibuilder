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
`clibuilder` is a peer dependency (`^12.0.0`).

## Placement map

Strategy: **capability-first**.

| Kind of work | Home |
| --- | --- |
| The `plugins()` extension: its options, its plugin sources, and handing the result to core | `extension/` |
| Importing and activating a plugin, and the context it receives | `loading/` |
| What `plugins list`, `plugins search` and the `plugins` group report | `commands/` |
| Package entry points, supported runtimes, and published artifacts | `distribution/` |

**Non-goals.** PnP-aware resolution (#575) is not here yet; see `extension/`.
