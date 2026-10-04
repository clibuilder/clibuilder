---
name: axi
status: draft
project-path: packages/axi
---

# @clibuilder/axi

`@clibuilder/axi` holds the output half of the AXI convention — how an
agent-facing CLI built on `clibuilder` reports its result. `clibuilder` owns the
other half, the exit codes that are its contract with a non-human caller; this
package re-exports them so an agent-facing command has one import.

It lives apart from `clibuilder` because TOON is agent-specific and should not
burden every `clibuilder` user, and because the AXI and TOON conventions move
faster than the parser does. `clibuilder` is a peer dependency.

## Placement map

Strategy: **capability-first**.

| Kind of work | Home |
| --- | --- |
| The `--format` option, encoding a result, and writing it to stdout | `output/` |
| Package entry points, supported runtimes, and published artifacts | `distribution/` |

**Non-goals.** Display choices that belong to one tool — such as collapsing the
home directory out of a path — stay in that tool.
