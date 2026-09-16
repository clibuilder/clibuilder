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
  - content: "Run the spec gate: Draft → Approved, freezing the ten nodes' suites"
    status: in_progress
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

## NEXT — resume here

**Run the spec gate on `packages/clibuilder/.agents/spec` (Draft → Approved).**
Authoring is done; the gate is the only remaining step. It is a conductor-run
step inside the mission loop (`spec-gate`, loaded at the end of explore), not a
standalone command — so re-enter the mission on this CR and drive it to the
gate rather than invoking the gate directly.

Its three deterministic pre-checks all pass as of `7313446`, so the gate should
go straight to spawning the cold spec-judge:

- `check-spec-state` — spec states OK
- `check-suite --files */*.feature` — suite checks OK (note the `--files` flag;
  without it the script scans nothing and prints OK, which reads as a pass)
- `check-spec-structure` — no blocking findings

### Blocking decisions for the gate

- **Nothing is `@pinned`.** All 253 scenarios were derived from the CFGs. If
  the judge wants any behavior pinned as a seed, that is a decision for the
  gate, not a gap to fix first.
- **The suites fix known-defective behavior as current.** Eight defects are
  specified as-is (see the ledger) rather than as the behavior anyone wants.
  The gate should confirm that is the right call for a backfill; the
  alternative is specifying intent and failing the impl gate on day one.
- **Three nodes exceed the 40-scenario soft ceiling** (execution 48,
  input-parsing 48, presentation 45). Advisory, and a formation/Warden call —
  decide at the gate whether to split before approving or defer.

### Findings the commits won't show

- **`check-suite` needs `--files`; bare invocation is a silent no-op.** It
  printed `suite checks OK` twice against zero files before the flag was found,
  which is how the 507-finding format break survived eight commits. Any future
  gate run must pass the flag and confirm a non-zero file count.
- **The scaffold left every node untagged.** `concept:` tags were absent, which
  is a blocking `check-spec-structure` finding and leaves the by-concept index
  empty. Fixed in `c865e44`; worth knowing for the next package backfilled from
  the same scaffold, and `args-minus` likely has the same hole.
- **The `args-minus` precedent is thinner than the governance requires.** Its
  nodes stop at a one-line `## Use Cases`. Do not copy it forward — see
  `## Resolved decisions`.

Do not relearn the working method or re-litigate the layout — see
`## Resolved decisions` and `## Working rhythm` above.

### After the gate

The deferred zod-removal CR that prompted this backfill now has a spec to be
judged against, and `distribution/` records the `z` re-export as current
published surface rather than settled design.
