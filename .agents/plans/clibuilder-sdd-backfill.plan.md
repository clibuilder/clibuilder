---
todos:
  - content: Scaffold the clibuilder package SDD skeleton
    status: completed
  - content: "Node: command-definition — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: input-parsing — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: execution — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: configuration — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: plugins — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: builtin-commands — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: presentation — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Node: testing — use cases, CFG, scenario map, suite"
    status: completed
  - content: "Reference nodes: distribution, tooling — confirm subject-only is complete"
    status: completed
---

# clibuilder SDD backfill

CR: Backfill the specification for the `clibuilder` command line application
framework, so later missions have a spec to change.

Opened because the zod-removal CR found no project spec for `packages/clibuilder`
to be judged against. That CR is deferred until this backfill lands.

Layout: capability-first, ten nodes, colocated at
`packages/clibuilder/.agents/spec`. `check-partition-quality` was run and
declined to decide — scoped to `packages/clibuilder/ts` the history is below the
floor (10 usable multi-file commits against 20), and the package-scope run
partitions on `fixtures/` versus `ts/` rather than on capabilities. The layout
follows the recommendation and the `args-minus` precedent, not the measurement.

## Resolved decisions

- **Node depth follows `spec-format-governance`, not the `args-minus` precedent.**
  That precedent stopped each node at a one-line `## Use Cases` bullet. The
  governance's backfill rule is explicit that a spec stopping at `## Use Cases`
  has named its entry points but neither the decisions nor their coverage, so
  each behavioral node here carries the four sections — `## What`,
  `## Use Cases`, `## Control Flow`, `## Scenario map` — plus a colocated
  `.feature` derived from the CFG.
- **The node file stays `README.md`.** Inherited from the scaffold and matching
  the `args-minus` layout; the root `spec.md` is the project spec, and a node
  file is its capability's README.
- **The CFG is drawn from the source, and the existing `*.spec.ts` suite is
  reference only.** Each scenario there is a claim to verify against current
  code, never the baseline to patch (`spec-format-governance`, ADR-0029).
- **Type-level decisions count as acceptance.** `command-definition`'s branches
  resolve in the type system and are observable through `type-plus`'s `testType`
  assertions, which the package already uses.

## Working rhythm

One node per unit of work: read the node's named source files, draw the CFG from
the code, write the four sections, derive the `.feature` 1:1 off the scenario
map, then commit that node alone (Conventional Commits, `docs(clibuilder):`).
Update this brief's todo status as each node lands.

## NEXT

The backfill is complete: all eight behavioral nodes carry their four sections
and a colocated suite bound 1:1 to their scenario map, and both reference nodes
name their sources. `check-spec-structure` reports no blocking findings.

Remaining, none of it this CR's:

- The spec is still `status: draft`. It has not been through the spec gate.
- Three advisory oversized-node findings (execution 48, input-parsing 48,
  presentation 45 scenarios) are logged for the Warden's formation pass.
- Eight defects and one backlog item were found while drawing the CFGs and are
  filed in this spec's ledger — each is independently actionable and none was
  fixed here, since a backfill specifies what the code does.
- The deferred zod-removal CR that prompted this backfill now has a spec to be
  judged against.
