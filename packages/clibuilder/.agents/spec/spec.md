---
name: clibuilder
status: draft
project-path: packages/clibuilder
---

# clibuilder

`clibuilder` is a command line application framework. It owns the layers a CLI
author should not have to rebuild — command definition and routing, input
parsing and validation, configuration loading, plugin discovery, help and
output rendering — and defers the application's own behavior to the commands it
runs.

Where a parsing library stops at "what did the user type", `clibuilder`
continues to "which command is that, are its inputs valid, what does this
application know about itself, and how is the answer rendered".

## Placement map

Strategy: **capability-first**.

| Kind of work | Home |
| --- | --- |
| Declaring what a command is — name, alias, arguments, options, config, nesting | `command-definition/` |
| Turning an argv vector into a matched command with typed inputs | `input-parsing/` |
| Assembling the application and running a matched command | `execution/` |
| Discovering, reading, and reporting the source of configuration files | `configuration/` |
| Discovering and activating third-party command packages | `plugins/` |
| The commands `clibuilder` itself ships | `builtin-commands/` |
| Rendering help, messages, and machine-readable output | `presentation/` |
| Helpers that let a command author test their own commands | `testing/` |
| Package entry points, supported runtimes, and published artifacts | `distribution/` |
| Build, test, and release support | `tooling/` |

Nodes are at most two levels below this spec root. Cross-cutting concerns use
`concept:` tags when unit specs are added.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `agent-interface` | `builtin-commands/` (behavior) · `execution/` (behavior) · `presentation/` (behavior) |
| `config-lifecycle` | `builtin-commands/` (behavior) · `configuration/` (behavior) · `execution/` (behavior) |
| `declaration-driven` | `command-definition/` (behavior) · `execution/` (behavior) · `input-parsing/` (behavior) · `presentation/` (behavior) |
| `error-reporting` | `execution/` (behavior) · `input-parsing/` (behavior) · `presentation/` (behavior) |
| `extensibility` | `builtin-commands/` (behavior) · `execution/` (behavior) · `plugins/` (behavior) |
| `packaging` | `distribution/` (reference) · `tooling/` (reference) |
| `test-doubles` | `execution/` (behavior) · `testing/` (behavior) |

<!-- END generated: by-concept -->
