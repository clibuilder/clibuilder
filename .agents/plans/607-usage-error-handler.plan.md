---
todos:
  - content: "Spec: execution — resolve a usage-error handler (command chain, then cli), and its outcomes"
    status: completed
  - content: "Spec: command-definition — onUsageError is declarable on every command arm, typed"
    status: completed
  - content: "Spec gate: cold spec-judge, then freeze the touched suites"
    status: completed
  - content: "Deliver: per-command onUsageError on top of the cli-level handler in PR #611"
    status: completed
  - content: "Rebase onto main, then impl gate: cold impl-judge against the frozen suites"
    status: completed
  - content: "Handoff: update PR #611, reconcile this brief"
    status: completed
---

# 607 — let a cli (or a command) report its own usage errors

CR: https://github.com/clibuilder/clibuilder/issues/607 · PR: https://github.com/clibuilder/clibuilder/pull/611
Spec: `packages/clibuilder/.agents/spec/` (nodes `execution/`, `command-definition/`).

Settled with the user (in-session):
- `onUsageError(errors, { command, ui })` on `cli()` options **and** on any command declaration.
- Resolution: nearest handler from the matched command up its parent chain, then the cli-level one, then the default print (errors + help).
- A plugin's commands get the same field through `addCommand`; a handler on a plugin's group covers its sub-commands.
- Exit code: usage (2) unless the handler returns a number. A throwing handler propagates.
- The existing frozen default-print scenario stays as-is: the handler scenarios specialize it (additive, no re-open).

## NEXT

Landed on PR #611: the spec gate was self-asserted after a cold judge passed it, and the user ratified the impl gate. Nothing left to resume; retire this brief once #611 merges.
