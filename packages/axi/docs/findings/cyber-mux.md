# cyber-mux AXI catalogue

Repo: ~/code/cyberuni/cyber-mux (pkg: packages/cyber-mux). Paths below are relative to packages/cyber-mux unless noted.

## HEADLINE
cyber-mux ADOPTS AXI (https://github.com/kunchenguid/axi) as its contract but has built ONLY the error surface, the `help[N]:` disclosure and the read truncation hint. It has NOT built: TOON default output (#1), `--fields` (#2), aggregate counts (#4), definitive empty-state strings (#5 beyond `(none)`), home view (#8), tool-identity header (#10). Human-readable padded tables + `--format json` is the actual output. There is NO toon library use anywhere in code (git grep -w toon hits only spec/docs/CHANGELOG). So the valuable lessons here are: error surface, stream discipline, exit codes, help[] blocks, truncation, and the *meta-lesson* that local restatements of AXI drifted from AXI and had to be corrected.
Spec of record: .agents/spec/axi.md ("what still trails the contract" ~line 249). Website: ~/code/cyberuni/cyber-mux/apps/website/src/content/docs/concepts/axi.md.

## 1. Helper public API
### src/output.ts (the format helpers, 96 lines)
- `tildify(path: string, home = homedir()): string` (L13) - collapse $HOME to `~` on a PATH BOUNDARY (`/home/unionalX` is not under `/home/unional`); home '' or '/' collapses nothing. HUMAN output only; JSON must keep absolute paths. Tested in src/output.test.ts (boundary, home itself -> `~`, root home).
- `printFields(fields: Record<string,string|null|undefined>): void` (L26) - `key  value` lines, key padded to widest key, two spaces; nullish entries DROPPED; prints nothing if all null.
- `type HelpEntry = { message: string; command: string }` (L41)
- `printHelp(entries: HelpEntry[]): void` (L49) - prints per entry, index from 0:
  ```
  help[0]: <message>
    -> <command>
  ```
  (ASCII `->`, two-space indent). Prints NOTHING for an empty list (omit-when-self-contained). Note: header is `help[0]:` per entry, not a single `help[N]:` count header with N items.
- `printTable<T>(items, cols: {label; get(item): string}[]): void` (L56) - empty list -> literal `(none)`; else UPPERCASED header row, dashes row (`-` x width), rows padded; 2-space gutters. Values with spaces stay whole in column (scenario lookup-list-space-rendered-whole).
- `output(data: unknown, readable: () => void): void` (L93) - the one dispatcher: `--format json` -> `JSON.stringify(data,null,2)` to stdout; else run readable().
- `isJsonOutput(): boolean` (L83) - exported so the error renderer honors it too.
- `isAutomatedOutput(): boolean` (L88) - true for fmt `json` or `agent`; used to refuse interactive prompts.
- internal `getFormat()` (L69) parses process.argv directly: `--format <v>`, or hidden alias `--json` => json.
### src/cli-options.ts
- `FORMAT_OPTION` = zod optional enum `['text','json','agent']` (L5-7). `agent` is RESERVED/unused beyond isAutomatedOutput (spec says it "collapses toward TOON default + the json escape" - never done).
### src/cli-error.ts (the error surface, AXI #6)
- `class CliError extends Error { code: string; message; help: string; exit: 1|2; extra?: Record<string,unknown> }` (L21)
- `class AmbiguousPaneError(locator, candidates: PaneCandidate[])` code `ambiguous-pane`, exit 2, message `"<loc>" matches N panes — an id resolves it`, help `retry with one of the ids: <id> <id>`.
- `class MissingPaneError(candidates)` code `missing-pane`, exit 2, message `no pane given — this command needs a target pane`, help `pass one of the ids below: <ids>` or (no enumeration) `list the live panes with: cyber-mux list`.
- `interface PaneCandidate { id; label: string|null; cwd: string|null }`; consts `AMBIGUOUS_CODE`, `MISSING_PANE_CODE`.
- `reportError(e: CliError): never` (L~110) - ONE renderer; writes stdout; `process.exit(e.exit)`.
  - json: `{ "error": { "code", "message", "help", ...extra } }` (pretty, 2-space). No prose beside it.
  - text:
    ```
    error: <code>: <message>
    help: <help>
      <id>  <label>  <cwd>        (one per candidate, only when extra.candidates)
    ```
    Code leads the human line so humans see the token scripts match on.
- Design: AmbiguousPane is THROWN (not reported in place) so each verb's catch-all must rethrow; a typed error prevents an exit-2 being flattened to exit-1 by a generic catch. (Lesson recorded in doc comment.)
### src/read-window.ts
- `capturedRows(text): number` (trailing newline is a terminator, '' = 0 rows); `isReadTruncated(capture, deeper): boolean` (probe one row deeper, compare ROW COUNTS not text); `FULL_SCROLLBACK_LINES = 1_000_000` (stand-in for "all" on backends with numeric-only read).
### src/cli.ts exported / key internals
- `usageErrorHandler(usage: string): cli.UsageErrorHandler` (L~2150) - translates clibuilder parser errors to CliError, ranked: invalid-key > conflicting-options > invalid-value > expect-single > missing-argument > extra-arguments; only ONE error reported (most actionable first; unknown flag first because rest of line may be misparsed).
- `reportWorktreeFailure`, `reportApplyFailure`, `paneVerb`, `guarded`, `resolveTarget` (internal).

## 2. Output shape (what actually ships)
- Default (text) = human tables / `key  value` fields, NOT TOON, NOT `key: value`. `--format json` = pretty JSON (never truncated, always carries explicit fields).
- list: columns `PANE LABEL HARNESS CWD` (+ `AGENT` only if some pane has agentStatus, i.e. herdr). Empty -> `(none)`. JSON `{ panes: [...] }` keeps agentStatus regardless. (src/cli.ts listCommand ~L1568-1598)
- doctor: fields via printFields (mux, via, pane, backend); `pane` shows `(none)` when absent (cli.ts L1136).
- exists: text `live` / `gone`; json `{ pane, live }`; exit 0 live, 1 gone (predicate; documented divergence). Ambiguous -> error (exit 2) replaces the answer.
- worktree list: columns `BRANCH ROOT WORKSPACE`; markers instead of bool columns: branch gets ` (*)` for primary checkout, ` (removable)` for linked+merged+clean+unoccupied (composite); root gets ` (gone)` when prunable (git's own word); paths tildified; json keeps raw `linked/merged/dirty/prunable` booleans (commits/PRs #63 `worktree-list-table-markers`, #65 disposability). Rule: a one-bit fact earns a MARKER on the column it is about, never its own column. Detdetail: docs/design/worktree-disposability.md.
- worktree prune: bare = preview (`WOULD REMOVE`/`BRANCH` table), `--force` = apply (`REMOVED`/`BRANCH`), plus `SKIPPED`/`REASON` table, plus help `N worktree(s) would be removed` -> `cyber-mux worktree prune --force`. json `{ applied, removed, skipped }`. Destructive default = side-effect-free preview.
- template save: stdout is now a `path` field payload (was bare path) + optional help; json `{ path, help? }`. (c456ef9 changeset "Breaking"; PR #41). Warnings stay on stderr.
- template apply: manifest (printFields template/cwd/workspace + pane table). Partial apply = ONE result payload (manifest naming the failed pane), exit 1, message to stderr (not a second stdout error). Scenario lookup-partial-apply-one-payload.
- Field-earns-slot rule (axi.md #2): `list` dropped constant `mux` column for `label` (changeset 9d027b3 sibling); agent column suppressed on backends where it is constant-absent. "A field earns its slot by discriminating, not by being known." Spec says default 3-4 fields; ships 4 (+agent).
- Empty values: json uses `null` explicitly (`workspace: null`, `agentStatus: null`); text printFields drops nullish.

## 3. Counts / aggregates (#4) and empty states (#5)
- Spec wants `list` -> `N panes across the <backend> backend` and `0 panes live`; NOT BUILT. Only `(none)` for empty tables. Spec text itself notes `(none)` as the existing empty state. No counts lines anywhere in code except help message `2 of 2 panes have no command` (template edit/apply help, cli.test.ts:1634) and `N worktree(s) would be removed`.

## 4. Next-step hints (#9)
- Shape: `help[i]: <message>` / `  -> <command>` in text; `help: [{message, command}]` in json, ON STDOUT in the payload. Only when there IS a next move; omitted for self-contained results (detail view, count, confirmation, `exists`).
- Dynamic parts: placeholders (`<pane>`, `<command>`) OR the caller's own locator, never a guessed id. Examples:
  - read truncated: message `older rows sit above this capture`, command `cyber-mux read <pane-as-typed> --full` (cli.ts L1374)
  - worktree add/open lost grouping: command `cyber-mux worktree add --branch my-feature --at workspace` (cli.test.ts:314); open: `cyber-mux worktree open <path> --at workspace`
  - template save multi-tab: message contains `3 tabs`, command `cyber-mux template save pool --workspace` (cli.test.ts:4470)
  - template edit: `cyber-mux template edit draft --set 1=<command>`
  - not-interactive error help: `set the values directly instead: cyber-mux template edit <name> --set <pane>=<value>`
- On error: help names the command that FIXES it; never "see --help" (except last-resort fallback in usageError default branches: `see: <path> --help`).
- EVOLUTION (#40/PR #41, commit c456ef9): suggestions started on STDERR as prose, and the spec demanded one from EVERY command. Both were wrong vs AXI: moved to stdout inside payload, and made omit-when-self-contained. Spec had falsely called #9 "unimplemented" while 2 stderr counter-examples existed (lesson: do not claim a principle unbuilt without grepping).

## 5. Error shape, streams, exit codes (#6)
- Exit codes (AXI's set, restated in full after a drop): 0 success incl. no-ops; 1 operation failed; 2 usage error (unknown flag, missing arg, malformed value/name, mutually exclusive flags, incomplete input i.e. bare `send`, ambiguous locator, missing pane). Exception: `exists` 1 = gone (predicate; grep/test/systemctl is-active framing) - a *recorded divergence*, label corrected from "amendment". `wait` mismatch -> exit 1 (cli.ts:1484). Conformance scripts use same set (scripts/test-adapter.ts:91; plan per-adapter-conformance-runner).
- Streams: stdout = EVERYTHING the agent consumes (payload, aggregate, help[], errors). stderr = diagnostics only (warnings, progress, debug, raw backend reason via exec.lastError/withReason); "discarding stderr entirely loses no part of the answer". Exception: `read` stdout is the pane's raw bytes.
- Invariant (lookup.feature lookup-failed-stdout-error-alone): stdout carries exactly ONE payload - either a result (which may itself report negative/partial outcome with nonzero exit: `exists` gone, partial apply) or a structured error. Never result + separate error. Exit code lets caller branch before parsing, so error-on-stdout does not corrupt `--format json | jq`.
- Error codes seen: no-mux(1), pane-not-found(1), ambiguous-pane(2), missing-pane(2), unknown-flag(2), missing-argument(2), invalid-value(2), usage-error(2), conflicting/ mutually-exclusive -> usage-error(2), not-interactive(2), edit-aborted(1), template-not-found, template-exists, invalid-template, invalid-template-name, invalid-set, empty-template, template-apply-failed(1), worktree-failed(1), agent-wait-failed, backend-unsupported(1), unsplittable-region. Codes MUST discriminate (scenario lookup-failure-codes-distinct warns the cheapest wrong impl is `code: error` everywhere).
- Unknown flag: `error: unknown-flag: unknown flag --force for list` / `help: valid flags for list: --format` (or `list takes no flags`); validated against the SUBCOMMAND's flags, not the group's (template list vs template save). `--help` is never an unknown flag (exit 0, help on stdout).
- missing-argument: `missing required argument: <name>` / help `provide <name>: <path> <<name>>`.
- invalid-value: `invalid value for <key>: <msg>, got "<v>"`; help = expected-value text or `see the accepted values with: <path> --help`.
- ambiguous: candidates printed `  <id>  <label>  <cwd>`; id is the retry (id outranks name; recognized by matching a live pane, never by string shape). cwd is what tells same-label panes apart.
- Missing pane (CR 95 / PR #96): was bare usage error naming the arg; now backend IS queried and live panes listed as candidates (collapses 2-turn correction to 1). no-mux outranks missing-pane (deeper error first; nothing to enumerate). Applies to all 8 pane verbs incl `agent status`; `agent wait` excluded since backend-unsupported outranks.
- Never leak dependency: backend (tmux/herdr) raw diagnostics are TRANSLATED into this CLI's code+help; raw text to stderr only (PR #49 / issue #42: `worktree-failed` catch-all used to forward raw backend text; fix distinguishes own `WorktreeGitError` (forwarded) from backend errors (generic message + stderr)).
- Never prompts (cli has no prompts) except `template edit --interactive`, which is REFUSED with `not-interactive` exit 2 if `!process.stdin.isTTY || isAutomatedOutput()` (cli.ts:997) - a prompt against a pipe blocks forever; `--format json|agent` refused even on a tty ("asking for machine output has said it is not a human"). This is the ONLY TTY detection; there is NO env var / isTTY switching of output format. No AXI_* env vars, no NO_COLOR/CI handling.
- Idempotency/no-ops: spec says mutations idempotent, no-op exit 0; no standalone "already X" message strings found. `worktree prune` bare previews.
- Evolution (#36 / PR #37, commit 9d027b3 feat(cli): structured errors on stdout, usage errors exit 2): before, ~15 verbs routed to one `fail()` free-text helper on STDERR, exit 1 for unknown flag/bare group; only ambiguity was coded. After: `CliError`+`reportError`, 22 call sites collapsed to one pass. Bare `send`: help to stdout exit 2 (was stderr, exit 1, which was *frozen in the suite*, needed a gate re-open). Layout/template exit codes reclassified: only malformed name, mutually exclusive flags, missing required param, (4 scenarios) -> 2; validate-content-invalid and mutating-verb failures stay 1.
- Evolution #194 (commit 4413c42): commander replaced by clibuilder 11.2.1; parser rejections keep coded stdout surface via `onUsageError` (usageErrorHandler); malformed value (`--at bogus`, `--lines abc`, bad `--env`) now coded `invalid-value` exit 2 (commander gave exit 1 + stderr text); missing `--branch` coded exit-2; mutually exclusive via clibuilder `conflicts: [...]`. `--version` reports package version. Known gotcha clibuilder#620: a passed falsy value is replaced by declared default (defaults applied in `run`). Upstream deps: clibuilder#606,607,608,609,617. Plugin subpath `cyber-mux/plugin` mounts verbs under `mux`; usage hints spelled via host name (`<host> mux`).

## 6. Truncation (#3) and read window
- Spec target: `… +240 lines — rerun with --full`. What shipped (commits 6b9cd39/cee584e/1535fab/e373173, PR #104, issue #100): ONE knob + ONE escape hatch. `read --lines <n>` bounds window; `--full` = whole scrollback (seam `lines:'all'`); both together = usage error exit 2 (no precedence rule; precedent `wait --match/--regex`).
- ALWAYS reports truncation (no flag). Truncated text capture: raw bytes, then `truncated  true` (printFields) then `help[0]: older rows sit above this capture` / `  -> cyber-mux read <pane> --full`. Complete capture = raw bytes ALONE (so `read | grep` unchanged). JSON always has explicit `{pane, text, truncated}` (+help when truncated).
- Evolution: first design (1535fab) was opt-in `read --truncation` with answer on STDERR in text; then 6b9cd39 merged "the two truncations" (AXI #3 body truncation vs backend scrollback elision) into one `--lines`/`--full`, `cee584e` moved answer to stdout. Lesson: AXI truncation and backend elision are the same question ("am I seeing everything, how do I get the rest?").
- Seam lesson (PR #104): return `{text, truncated?}` richer result, not a companion call; `truncated` ABSENT, never `false`, when not asked (false would mean "didn't check" == "you have everything"). Opt-in at library seam because probe costs one extra query; CLI always asks. Detection by probing one row deeper and comparing row counts.
- Silence is not an inference: check is unconditional, so no hint == asked, nothing omitted.

## 7. Flags
- `--format text|json|agent` (agent reserved), hidden alias `--json`. Parsed from raw argv. No `--fields`, no `--full` except `read`, no `--limit`, no `--quiet`.
- `--full` (read only), `--lines <n>`, `--force` (prune applies; remove discards changes), `--env KEY=VALUE` repeatable (split on first `=`, bad pair rejected BEFORE anything opens), `--at workspace`.
- Per-subcommand `--help`: via clibuilder now (was commander); spec wants 2-3 usage examples per subcommand - NOT yet added. Descriptions embed marker legend (e.g. worktree list description explains `(*)`, `(removable)`, `(gone)`).

## 8. Content-first / home view (#8, #10) - UNBUILT
- Bare `cyber-mux` prints help, divergence recorded. Bare `send`: help stdout exit 2 (#6 incomplete input, NOT #8). Bare `worktree`: help + exit 1 left alone on scope. Whether #8 extends to command groups: OPEN, belongs to AXI. #10 tool identity (absolute exe path with ~ + one-sentence description) not built. #7 ambient context out of scope.

## 9. Meta-lessons (valuable for a shared package)
1. Local restatements of AXI drifted from upstream and were then treated as the contract: dropped exit `2`; stderr for errors/suggestions; "every command owes a suggestion"; #8 widened to groups; #10 tool-identity half dropped. Fix: read upstream AXI directly; document divergences as divergences ("exists 1=gone"), not "amendments". A shared @clibuilder/axi package removes this drift class.
2. One shared renderer (`reportError`) + one error class (`CliError`) made a 22-site fix a single pass; contract tests should pin SURFACE rules once (lookup.feature "shared AXI error and usage contract") not per verb.
3. Codes must discriminate; code leads human line (`error: <code>: msg`).
4. Typed throw (not report-in-place) for errors raised deep in resolution so generic catch-alls cannot flatten exit codes.
5. Error + candidates collapse round trips (unknown flag lists valid flags; ambiguous/missing pane list candidates with ids that are the retry).
6. Constant columns are noise; one-bit facts become markers on the relevant column; JSON keeps raw fields.
7. Human-only rewrites (tildify, markers, column suppression) never apply to JSON.
8. stdout carries exactly one payload; exit code decides which.
9. Booleans meaning "unknown" must be absent/null, not false (truncated, isPaneFocused "cannot say" fix 9c3ac49).
10. The sibling bins cyberplace (.agents/specs/cyberplace/axi/) and packages/universal-plugin (ADR-0003) adopt the same contract but still emit errors on stderr (follow-up recorded, ledger 36-axi-error-surface seq 2) - AXI is tiebreaker.

## 10. Sources / pointers
- Specs: packages/cyber-mux/.agents/spec/axi.md; spec/cli/lookup/README.md + lookup.feature (shared error contract, scenarios with @id:lookup-*); spec/design/decisions/README.md (36-axi-error-surface grill, lines ~60-150); ledger/36-axi-error-surface.e9e767.jsonl, 40-layout-suggestions-on-stdout, 42-worktree-failed-backend-text, 95-missing-pane-lists, 63-worktree-list-table-markers; glossary.md:79.
- Code: src/output.ts, src/cli-error.ts, src/cli-options.ts, src/read-window.ts, src/cli.ts (usageErrorHandler ~2150; readCommand ~1315; list ~1568; worktree list ~2000; prune ~2060), tests src/output.test.ts, src/cli.test.ts (help asserts at 313, 703, 1634, 4456-4471), src/read-window.test.ts.
- PRs: #37 (error surface, closes #36), #41 (suggestions to stdout, closes #40), #49 (backend leak, #42), #35 (address pane by name/id, #31), #96 (missing-pane lists candidates #95), #104 (read truncation #100), #84 (cli/ mirror nodes), #65 (disposability), #194 (clibuilder swap). Changesets in CHANGELOG.md L537, L887-906, L948-955.
