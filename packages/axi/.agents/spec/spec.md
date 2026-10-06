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
| Errors, usage errors, next-step hints, truncation, counts, empty states, and the home header | `output/` |
| Package entry points, supported runtimes, and published artifacts | `distribution/` |

**Non-goals.** Display choices that belong to one tool stay in that tool.
Collapsing the home directory out of a path used to be one; four repos
re-implemented it and upstream AXI ships it for the home view, so it moved in.

The findings this package was completed from, and the decisions taken where the
repos disagreed, are in [`docs/findings/`](../../docs/findings/README.md).
