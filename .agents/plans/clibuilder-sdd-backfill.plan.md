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
  - content: "Remediate the input-parsing judge findings (UC3, four CFG gaps, sub-graph D)"
    status: pending
  - content: "Re-run the seven ungraded node judges (command-definition, execution, configuration, plugins, builtin-commands, presentation, testing)"
    status: pending
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

**The spec gate is mid-run and stalled.** Deterministic pre-checks all passed;
the cold spec-judge was fanned out one per behavioral node (eight judges, each
blind to `ts/**` and the `*.spec.ts` suite). **Seven of the eight died on a
session limit before returning.** Only `input-parsing` graded, and it came back
**FAIL on all three lenses**. So:

1. **Remediate the `input-parsing` findings** (below) — the producer's job, and
   the findings are evidence, not a work order (`sdd:remediation-governance`):
   substantiate each, name the rule it instantiates, and sweep the other seven
   nodes for the same rule before re-deriving.
2. **Re-run the seven ungraded judges.** Their verdicts are unknown — do not
   assume they would have passed. `input-parsing` was one of the strongest
   nodes by the judge's own read, so expect findings elsewhere.
3. Only then take the gate verdict.

### Gate mechanics, confirmed this session

Base ref for the CR diff: `3a90891` (merge-base with `main`). The whole spec
tree is new, so every scenario is added and `classify-edit-class` reports
`UNFROZEN-SKIP` for all eight suites — no Clearance exposure at this gate.

Deterministic pre-checks, all green as of `3770158`:

- `check-spec-state --root <spec>` → spec states OK
- `check-spec-state --files <touched .md> --base <baseref>` → exit 0; six `⚠`
  findings, all the same false positive: a node README writing ``​`plugins/`​``
  to mean the sibling spec node is read as a repo-root-relative `plugins/`
  path. Surfaced for judgment, never a block. Not worth "fixing" — the prose is
  right and the checker's prefix list is what is coarse.
- `check-suite --files <spec>/*/*.feature` → suite checks OK, 8 files
- `check-spec-structure --spec-dir <spec>` → **`--spec-dir`, not `--root`**;
  with `--root` it silently scans `.` and reports the wrong tree. blocking[0],
  three oversized advisories.

**Shell gotcha that cost a cycle:** this session's shell is zsh, where an
unquoted `$VAR` does *not* word-split. Passing a captured file list as
`--files $FILES` hands the script one giant newline-joined filename and it
reports `cannot read file`. Use a literal glob — `--files <spec>/*/*.feature`.

### Judge findings — `input-parsing` (FAIL, all three lenses)

`ALIGNED: true`, `CONFORMANCE: ok`, no open markers. Three root causes:

1. **UC3 (`lookupOptions`) is unsettled.** No actor in the Actors table, no
   control-flow sub-graph, a goal that restates the mechanism, and three
   scenarios resting on no drawn graph. Decide: is it a surface element (name
   the sibling that calls it, draw its sub-graph) or an internal step of UC2
   (fold it in, drop its three scenarios)? This one call clears five findings.
2. **Four decisions live in the scenario map or prose but were never drawn into
   the CFG** — option-value accumulation (a *stated* UC1 extension), the
   single-dash cluster with `=`, and the two omitted-type defaults. Fix in the
   **graph**; the 1:1 binding then re-derives the scenarios. Also missing: the
   positive companion pinning that `_` is still skipped (`SKIP2`) — without it,
   a later fix to gap 1 has nothing holding the `_` half in place.
3. **Sub-graph D is malformed.** `K` both dispatches an exclusive type fan-out
   and falls through unlabeled to `MULTI`, so the multi-value guard's order is
   undefined; and `NOK`/`SOK`/`EL` never reach `SP{schema accepts?}`, which
   asserts by omission that number, string, and array values bypass schema
   validation — a claim nothing else in the node makes.

Plus one scenario-level repair: `a type the parser cannot convert is handed to
its schema unchanged` has no readable artifact behind its `Then`. Assert the
observable consequence instead. And `a key matching nothing resolves to
nothing` asserts two behaviors, the second already covered elsewhere.

**The judge endorsed the defect-as-is call without reservation** — four
independent honesty markers (the `**Known gaps.**` block, per-scenario
comments, the surface-trace annotation, the in-graph gap nodes), and nowhere is
a defect dressed as intent. It also called the inline gap-annotation convention
worth promoting corpus-wide in a non-flow-edge form.

**Split advisory (48 > 40): hold as one node, and the judge would not split it
later either.** The obvious seam (tokenizing vs matching/filling) is the wrong
one — the node's own three defects straddle it, so a single fix would cross two
nodes. If ever forced, the clean cut is *conversion* (sub-graph D, 11
scenarios): it takes only a declared type plus raw strings and has no
change-coupling to the rest. Worth recording so it is not re-litigated.

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
  decide at the gate whether to split before approving or defer. `input-parsing`
  is now graded: **hold, do not split** (reasoning above). `execution` and
  `presentation` still need their judge's read.
- **Each frozen defect scenario becomes a Clearance event later.** Approving
  this gate freezes eight scenarios that specify defects; every later fix is a
  *narrowing* of a frozen suite and will fire Clearance. That is the mechanism
  working, but brief the fix mission to expect it rather than meet it at the
  gate.

### Digest facts (assembled at the gate, so the next run need not re-derive)

253 scenarios across eight suites — execution 48, input-parsing 48,
presentation 45, configuration 30, builtin-commands 24, plugins 24, testing 21,
command-definition 13. **No tags anywhere in any `.feature`** — nothing
`@frozen`, nothing `@pinned`, confirmed by grep. No `<!-- open: -->` markers in
the tree. No `.agents/universal-plugin.json`, so every production role resolves
to an SDD default; no `produced-by` frontmatter exists on any node, which is
absent-not-malformed and does not fail the provenance check.

Two ownership seams a cross-node sweep flagged as worth a judge's eye, both
looking clean but unconfirmed: `builtin-commands/` claims *declaration* of
`--help`/`--version`/the log flags/`--show-config` while `execution/` claims
their *handling* (check for a duplicate scenario, especially "bare command shows
help"); and `presentation/`'s display-level scenarios sit opposite `execution/`'s
log flags — mechanism vs flag, the highest paraphrase risk in the corpus.

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
