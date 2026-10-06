# AXI catalogue: GitHub-sourced findings (cyberuni + repobuddy orgs)

Scope: cyber-figma and cyber-slack (no local checkout; shallow-cloned read-only), buddy-agent-harness (local), issues/PRs across both orgs, mux/universal-plugin spec files via gh api.
Upstream AXI spec = https://github.com/kunchenguid/axi (10 principles). "AXI #n" below = that numbering:
1 token-efficient (TOON), 2 minimal default schema, 3 truncation + --full, 4 pre-computed aggregates, 5 definitive empty states,
6 structured errors / exit codes / no prompts / idempotent, 7 ambient context (session hook + skill), 8 content-first (bare binary), 9 contextual disclosure (next-step help), 10 consistent help (+ bin path with ~, description).
Search coverage: `AXI`, `toon`, `agent-facing output`, `--format toon` (gh rejects the last as a flag; the phrase returned nothing). "agent-facing output" returned nothing in cyberuni; only repobuddy#122/#128 matched on "agent-facing" (governance, unrelated to format).
Not found: `.research/agentic-configuration-standards` has NO AXI content (only an unrelated "shadowedBy" hit). No standalone AXI repos issues in cyber-figma / cyber-slack (only Dependency Dashboards).

---------------------------------------------------------------------------
## A. HEADLINE DISAGREEMENTS (read these first)

### A1. Errors and next-step hints: stdout vs stderr (the biggest split)
| Position | Who | Date |
|---|---|---|
| stderr: errors, next-step line, warnings. stdout = machine result only. | universal-plugin ADR-0003; cyberplace axi node + tavern (PR #180) ; buddy-agent-harness (doctor, #21/#61); cyber-figma (`console.error(renderCliError(...))`) | 2026-07-04 ADR; 2026-07-13 PR #180; 2026-08-17 #21; figma main 2026-10-05 |
| stdout: errors, hints, empty states, usage. stderr = diagnostics only. (AXI's own text: "stdout: all structured output the agent consumes - data, errors, suggestions") | cyber-mux #36/#37 (2026-07-17), #40/#41 (07-18); gherkin-cli PR #12 (07-18); cynapse PR #40 (2026-10-05) | newer |

- Resolution so far: AXI itself is the stated tiebreaker. Newer repos (mux, gherkin-cli, cynapse) moved to stdout. cyberplace/universal-plugin/figma/buddy-agent-harness still on stderr as of last read. cyber-mux ledger records "cyberplace's axi node inverts AXI on streams, word for word" as a backlog follow-up (GitHub: cyberuni/cyber-mux/packages/cyber-mux/.agents/spec/ledger/36-axi-error-surface.e9e767.jsonl seq 2).
- buddy-agent-harness knowingly chose stderr "matching init, not AXI section 6's stdout. Moving both is a behavior change ... belongs in its own PR" (GitHub: repobuddy/buddy-agent-harness#21, 2026-08-17). Its issue #61 (2026-08-18) calls errors-on-stdout a BUG ("the error line lands in the stream they are parsing. It belongs on stderr"). So buddy-agent-harness argues the opposite of mux for the same stream, one month later. Rationale differs: buddy keeps TOON on stdout clean for parsers; mux argues an error and a result can never coexist (exit code decides), so stdout is safe.
- Practical consequence for @clibuilder/axi: make the error stream a single configurable policy; default to stdout (AXI text + 3 newest adopters). Provide exit code as the discriminator.

### A2. Usage-error exit code: 1 vs 2
- AXI: 0 success (incl. no-ops), 1 error, 2 usage error (unknown flag, missing required param). Commander default is 1.
- mux restated it as 0/1 only for months; "never argued" omission; fixed 2026-07-17 (GitHub: cyberuni/cyber-mux#36, #37). cyber-asana audit flagged same (#94, 2026-07-20; fixed PR #110 2026-08-04). gherkin-cli fixed PR #12 (07-18). cynapse already 2 (PR #40, 10-05). cyber-figma has 2.
- Still divergent: cyberplace tavern "unknown flag exits 1 naming the flag" (GitHub: cyberuni/cyberplace#180, 2026-07-13; older than mux fix; newer sibling says 2). buddy-agent-harness: "format invalid / unknown harness -> exit 1".
- Extra pseudo-conflict: `exists` predicate in mux keeps exit 1 for `gone` (a documented divergence from AXI's 1=error). Open question: move `gone` to 0 as a definitive empty state? (ledger seq 3). 

### A3. Doctor-style reports: findings exit 0 vs non-zero
- buddy-agent-harness `doctor` exits 0 even with findings; exit 1 only when the tool itself fails (invalid format, unknown harness, crash). Reason: "a non-zero code reads to an agent as 'this command is broken, try something else'" (local: packages/buddy-agent-harness/.agents/spec/cli/diagnosis-report/README.md; GitHub: repobuddy/buddy-agent-harness#21 "Exit 0 even with findings. --strict deferred").
- universal-plugin PR #64 (2026-09-08) takes the middle route for `plugin build`: zero vendors from a manifest that really declares none = definitive empty result, exit 0; zero vendors AND a pre-0.6 layout signal = "dropped read", exit 1. Rule: "errors iff the target set is empty and at least one pre-0.6 signal is present". Lesson: silent `built 0` exit 0 in a release chain read as success.
- cyber-asana: parse exit 0 vs validate exit 1 inconsistency in gherkin-cli noted as unresolved product call (GitHub: cyberuni/gherkin-cli#12): `parse` reports `errors: 1` yet exits 0 while `validate` exits 1.

### A4. Default format: TOON vs text
- TOON default: mux (contract), universal-plugin (ADR-0003 2026-07-04), cyberplace tavern, buddy-agent-harness (`--format toon|json|text`, default toon), gherkin-cli.
- Text default + opt-in `--toon` / `--json`: cyber-asana (PR #80, 2026-06-25) and cyber-figma. Their flags are boolean globals (`--toon`, `--json`, `--full`), NOT `--format`. MCP side: env `CYBER_ASANA_MCP_FORMAT=toon` / `CYBER_FIGMA_MCP_FORMAT=toon` applied centrally (`withMcpOutputFormat`).
- So two flag grammars exist: `--format <toon|json|text>` (mux, universal-plugin, cyberplace, buddy) vs `--toon`/`--json` booleans (asana, figma). mux also has an `agent` format reserved/unused.

### A5. Next-step hint syntax: three spellings
1. `help[N]:` block inside structured payload on stdout, entries `{message, command}` (mux #41, gherkin-cli #12/#14).
2. `help[N]{command,instruction}:` two-column TOON table (buddy-agent-harness #60, 2026-08-18).
3. stderr arrow line `-> universal-plugin plugin validate` (universal-plugin #89/#187, #84; cyberplace tavern `-> cyberplace add <name>`) and text-only "Next steps:\n  - ..." list on stdout (asana, figma; suppressed under --json/--toon).
Also mux #104 sample: `help[0]: older rows sit above this capture\n  -> cyber-mux read %3 --full` (count 0 with a heading).

---------------------------------------------------------------------------
## B. CONVENTIONS (concrete), by AXI topic

### B1. Format/flags
- buddy-agent-harness encoder (local: packages/buddy-agent-harness/src/command-output/command-output.ts):
  - `type OutputFormat = 'json'|'toon'|'text'`, `formats = ['toon','json','text']`.
  - `parseFormat(value)` throws `Error('--format must be toon, json, or text.')` for anything else including undefined: "a caller that misspelled --format and got TOON anyway would parse the wrong thing and never learn why." Spec scenario: "rejects anything else rather than falling back silently ... failure names the three formats it accepts".
  - `writeResult(value: object, format)` is the single stdout boundary: `process.stdout.write(encodeResult(...)+'\n')`; JSON compact (`JSON.stringify(value)`, no pretty), TOON via `@toon-format/toon` `encode`.
  - `writeDocument(content)` bypasses encoders (a Markdown body through TOON "comes back as one escaped line"); adds exactly one trailing newline. A command makes exactly one of the two writes. `governance show`/`reference show` default to the verbatim document; `--format json|toon` wraps `{name, scope, path, content}`.
  - Text renderer is shape-driven, knows nothing of domain keys: scalar `key: value`; nested record `key: {json}`; list of records = padded table (columns = union of keys, blank cell for missing); list of primitives = `  - item`; empty list = `key: (none)`; blank line separates multi-line block from neighbours.
  - Home collapse: `collapseHome(home, path)` -> `~/...` (AXI #10); `displayBinPath` falls back to the package name `buddy-agent-harness` when executable unknown. A `bin:` field is always present in doctor report ("a report a caller cannot trace to the binary that wrote it cannot be reproduced").
  - Lesson: the encoder is not on the public surface; a non-process caller uses report builders returning objects (#61: export `run(argv): Promise<number>` returning exit code, never mutate process.argv; bin owns process.exitCode).
- cyber-mux: JSON stays the escape; programmatic composition after `layout save` change: `cyber-mux layout save x --format json | jq -r .path` (PR #41 breaking: bare path stdout became a `path` field). Lesson: moving to structured-by-default changes scripts.
- cyber-figma: `output(data, readable)` single switch (toon -> `console.log(encodeToon(data))`, json -> printJson, else readable()). AGENTS.md: "never branch on process.argv for format in a command".
- cyber-asana: PR #80 `src/toon.ts` global `--toon`; "Aggregates, next steps, and summaries are text-mode only, so --json/--toon output stays cleanly parseable" (2026-06-25). Bug found 2026-07-20: mutation acks ignored --json/--toon (15-18 sites printed prose); fixed PR #110 by routing through output().

### B2. Counts / aggregates (AXI #4)
- Literal strings: `N panes across the <backend> backend` (mux), `built N, skipped M, failed K` (universal-plugin build), `N schema violations, M vendor violations` (plugin validate), `N crews` (cyberplace tavern), `count: "1 of 1 total"` and `errors: 0 syntax errors across 1 file(s)` (gherkin-cli), `findings: 0 problems found - the 1 bridge resolves` (buddy doctor).
- Bug/lesson: cyber-asana only task lists had a count summary; 11 other domains had none (#94 -> #110). Text-mode-only summaries vs summary inside structured payload: mux/universal-plugin put aggregates INSIDE the payload (TOON/JSON); asana/figma print them text-only. This is a real disagreement: a program reading --json from asana/figma gets no counts.
- Bug: asana `Next offset:` pagination hint was ungated helper; in practice not leaking (all 17 call sites inside text-only branch) but helper itself gated in #110 (2026-08-04). figma `printNextPageHint` text-only: `More results. Next page: <command> --cursor <c>` + `Stopped at --max-pages after N pages.`

### B3. Empty states (AXI #5)
- `0 panes live` (mux), `0 crews found` (cyberplace), `0 files found` / `0 <entity> found` via `printEmpty(entity)` (figma/asana), `built 0` + "nothing to build" (universal-plugin), healthy sentence in buddy doctor (never an empty section: "an empty section is indistinguishable from a section the caller asked for wrongly").
- Bug: asana empty output was bare `0 results` since no caller passed entity name (#94); fixed with entity names at 17 sites (#110). Mux's `list` printed `(none)`; the text renderer in buddy still prints `key: (none)` for empty lists (text only, for people).
- DANGEROUS empty state: universal-plugin `built 0` exit 0 after a dropped pre-0.6 `vendorExtensions` block (PR #64, 2026-09-08). Lesson: empty is only definitive if you can distinguish "nothing exists" from "input was not read". Add a signal check before declaring empty.
- `read` truncation: absent never `false` when nobody asked (mux #104): "A false that means 'I did not check' is indistinguishable from 'you have everything'". Same philosophy for list `agentStatus` column (omitted where backend can't feed it, #95).

### B4. Truncation (AXI #3)
- Literal hints: `... +240 lines - rerun with --full` (mux contract, universal-plugin governance show), `... +N more - rerun with --full` after 20 rows (universal-plugin validate PR #84, 2026-09-14), `... [truncated, <n> chars total; use --full for the rest]` (figma truncate()), `... +N lines - rerun with --full` roster (cyberplace tavern). JSON never truncated.
- Lesson: `--full` collision. mux #104 first added `--truncation` flag, then renamed `--omitted-rows`, then (2026-08-04) merged with existing knob: `--lines <n>` window, `--full` whole scrollback, `--lines` + `--full` = usage error exit 2 (not precedence). Final shape:
  ```
  $ cyber-mux read %3 --lines 20
  ...the 20 rows...
  truncated  true
  help[0]: older rows sit above this capture
    -> cyber-mux read %3 --full
  ```
  Hint rides a truncated capture ONLY; complete capture stays raw bytes so `read | grep` is unchanged. `--format json` always spells `truncated`. Report on every read, no opt-in flag at CLI (seam keeps opt-in because polling runs read per tick).
- Lesson: gherkin-cli `--full` means two things (adds schema fields AND skips truncation); splitting is breaking, left unresolved (PR #12, 2026-07-18). cyber-asana `--full` documented as global but was a no-op everywhere except one call site (#94: `truncate()` had a single call site).
- Lesson: batch inputs inflate help blocks. gherkin-cli PR #14 (2026-07-19): 26-file parse echoed all paths twice, ~6.2KB. Fix `fileArg(files)`: one file -> the path, many -> `<files...>`. AXI #9: dynamic values as placeholders. Literal after: `gherkin-cli diff --base <ref> <files...>`.
- Lesson: help hints should name the truncation reveal explicitly: mux `layout save` bare in multi-tab workspace -> `help` entry naming `cyber-mux layout save <name> --workspace` (PR #41).

### B5. Errors: shape, codes, exit codes, help (AXI #6)
- Shapes seen:
  - gherkin-cli (stdout, TOON):
    ```
    error: true
    code: EBADFLAG
    message: "unknown option '--bogus'"
    help[2]:
      "valid flags for `validate`: --format <fmt>"
      "gherkin-cli validate --help"
    ```
  - cynapse (stdout) text: `error: <message>`; `--json`: `{ "error": { "code", "message" } }` pretty-printed. Codes: `usage`(2), `not_found`(1), `id_conflict`(1), `port_in_use`(1), `gui_not_installed`(1), `failure`(1 fallback). Contract: "a code never changes meaning. A failure can later move out of `failure` into its own code. The message is not part of the contract." `errorCodeFor()` derives `usage`/`failure` from exit code. Commander `exitOverride` must read `--json` itself (usage errors fire before the preAction hook sets format); strip Commander's own `error:` prefix to avoid doubling. (GitHub: cyberuni/cynapse#40 merged 2026-10-05)
  - cyber-figma (stderr via console.error): `{ok:false, error:{kind:'figma_api'|'config'|'internal'|'usage', code, message, status, reason, hint, retry_after_seconds, plan_tier, rate_limit_type, upgrade_link, command, valid_flags}}`; text: `Figma API error: <msg>\nHint: <hint>`; usage text lists `Valid flags for \`cyber-figma task list\`:` then `Hint: Run \`<path> --help\` for the full reference.`
  - mux: every error a `CliError` with stable `code` + `help:`; codes seen `ambiguous-pane`, `missing-pane`, `worktree-failed`, `layout-not-found`, `invalid-template`, `backend-unsupported`, `no-mux`. Candidates rendered `<id>  <label>  <cwd>`.
  - buddy-agent-harness: error line `error: <message>` to stderr, exit 1.
- Exit-code tables:
  - AXI baseline: 0/1/2.
  - cyber-asana (PR #80): 3 auth/config, 4 forbidden, 5 not found, 6 rate limited.
  - cyber-figma: 0 ok, 1 error, 2 usage, 3 auth/config (also unauthenticated), 4 forbidden, 5 not found, 6 rate limited, 7 above the plan level (billing fact, retry never helps). "The full map ... is part of the contract agents branch on."
  - Note asana and figma agree on 3-6; figma adds 7. cynapse and mux do NOT use 3-6 (they use 1 + a string `code`). Disagreement on how to carry error class: distinct exit codes (asana, figma) vs one exit code + string `code` (mux, cynapse, gherkin-cli). Figma uses both.
- Unknown-flag errors must self-correct: list valid flags inline (mux #37, gherkin-cli #12, asana #110, figma `valid_flags`). Per-command flag list incl. inherited ones (asana). Commander must throw not exit (`exitOverride`), tagged with the command that raised it. InvalidArgumentError thrown inside action handlers carries no command context and stays on ordinary path exit 1 (asana #110 caveat); figma `isUsageError` requires `command` tag for the same reason. Clean exits (`--help`, `--version`) must not be treated as usage errors (`isCleanCommanderExit` -> exit 0).
- Open gaps (cynapse #41, 2026-10-05, open): errors lack a `help:` next step (text and --json); unknown-flag errors do not list valid flags; bare-group usage went to stderr while the error saying "see the usage above" went to stdout -> "an agent sees the pointer but not the usage it points to." Repro: `cynapse channel 2>/dev/null; echo $?` -> `error: ... see the usage above` + `2`. Expected: usage reaches stdout or is inlined in the error. Lesson: when you move ONE channel to stdout, move ALL related output (usage, hints, empty states), or error text points at invisible content.
- Do not leak dependency names/text (AXI #6): mux #42/PR #49 (2026-07-18): `worktree-failed` catch-all forwarded `err.message` verbatim incl. backend raw stderr; fix: dedicated `WorktreeGitError` for own refusals (verbatim), everything else translated to generic coded error, raw diagnostic redirected to stderr. Lesson: a stable code around untranslated backend text is still a leak.
- Errors on missing required arg should name the fix: mux #95/PR #96 (2026-07-25): missing `<pane>` -> exit 2 + list live panes as candidates (same shape as ambiguous-pane); no mux -> still exit 2 and names `cyber-mux list`. Done at one chokepoint `resolveTarget`; `no-mux` (1) and `backend-unsupported` (1) outrank it. Precedence rule among errors matters. A frozen scenario ("having called no backend") had to be re-opened.
- Wrong-credential diagnosis: cyber-asana #120 (2026-08-08): OAuth rejection passed verbatim "Asana rejected the token request: <error_description>" with no hint that an MCP-app client id was used on an API-app endpoint; plan: additive hint (never replace the underlying message), `auth status` reports masked client id + source + shadowed loser; local-only, offline. Lesson: add diagnosis hints additively so mis-detection never hides the real error. Token masking: home view reports credential as boolean, never echoed (figma).
- Idempotent deletes: figma `deleteIdempotently()` -> `{deleted:true, resource, id, already_absent:boolean}`; asana #110: repeat delete succeeds with `already_absent: true`, non-404 failures still propagate; caveat: MCP delete tools still surface 404 (moved to CLI layer only).
- No prompts: universal-plugin `plugin init` non-interactive by default; `--yes` becomes compat no-op (ADR-0003).

### B6. Content-first, home view, identity (AXI #8, #10)
- figma `renderHomeView`: `{bin, description, auth:{configured,mode}, team, resources[], next_steps[]}`; bin collapses `$HOME` to `~`; description const `Figma REST API CLI and MCP server for AI agents`. Next-steps are conditional on state (no token -> `Set FIGMA_ACCESS_TOKEN ...`).
- gherkin-cli bare invocation (PR #12): prints `.feature` inventory:
  ```
  bin: ~/.local/bin/gherkin-cli
  description: "Parse, validate, and diff Gherkin .feature files as token-efficient agent output"
  count: "1 of 1 total"
  features[1]{file,scenarios,tags}:
    feat/login.feature,1,[@smoke]
  help[3]: ...
  ```
  Reviewer notes: glob of `**/*.feature` from cwd on every bare run (cap 20 on output not walk); `bin:` shows `src/cli.ts` under tsx, `dist/cli.js` built.
- asana: no-args shows authenticated user + next steps (PR #80); `bin`/`description`/`version` added to home view in text AND structured (#110).
- mux: no home view; bare `cyber-mux` prints help (known gap, ledger seq 5). Mux DISPUTES AXI scope: #8 is for the bare binary only; the previous widening "any command group invoked with no subcommand shows live data" was a local restatement, retracted. Open question for AXI: should content-first extend to data-bearing groups? Mux: bare `send` -> help to stdout, exit 2 (incomplete input, not an #8 case). universal-plugin ADR-0003: group-level content-first: `governance` -> list, `plugin` -> validate; bare `universal-plugin` stays a dispatcher; PR #84: bare `universal-plugin plugin` validates the project and lists declared harnesses.
- `--version` correctness: universal-plugin PR #77 (2026-09-12) read from CLI's own package.json via import.meta.url (was wrong); buddy #61: `cli({version:'0.1.0'})` stale at 0.6.0 for 5 minors. Lesson: derive version from manifest, never hard-code.
- Per-subcommand `--help` with 2-3 examples: asana added examples to 13 resource group `--help` but NOT the ~70 leaf subcommands (#110 partial). Flag-surface hygiene: asana had both `--x-gid` and legacy `--x` alias (doubled surface), and `task search` `--project/--tag/--section` meant filters not gid aliases (same name, different meaning per subcommand; unresolved).

### B7. Minimal default schemas (AXI #2)
- asana default `optFields` `gid,name,completed,due_on` (also fixed blank Done/Due columns) (PR #80); only 1 of ~20 list commands did it (#94) -> all 11 rolled out (#110).
- mux: "A field earns its slot by discriminating, not by being known": `list` drops constant `mux` column; `list` rows `pane, label, harness, cwd`; `doctor` -> `mux, via, pane, backend`; `agentStatus` column only on herdr. 3-4 fields ceiling.
- figma: `file get` with no `--ids` or `--depth` returns pages only.
- TOON tip (buddy #60): ALWAYS emit both columns of a table with `""` rather than omit a key: "with an optional key the TOON encoder degrades the whole array from its tabular form to a nested list". Literal:
  ```
  help[5]{command,instruction}:
    git ls-files -z .windsurf/skills | xargs -0 git update-index --skip-worktree,run `...` to restore ...
    "","hand CLAUDE.md to `/buddy-agent-harness:init`, which writes the bridge into it"
  ```
  Before (bug): `help[5]: Run \`git ls-files ...\`,"Run \`/buddy-agent-harness:init\`",Run \`remove .windsurf/skills and enable ...\`` - prose wrapped in "Run `...`" so agents may paste prose into a shell. Resolution (2026-08-18): split `command` (runs verbatim AND completes the repair; empty = judgment) from `instruction` (always present). Safety property: "a caller that executes every non-empty command and nothing else cannot destroy work" - diagnostics (git diff) are not commands.
- repair/help rows dedupe on the (command, instruction) pair.

### B8. Reporting truncated/"what you didn't get" in data APIs
- mux #104 (2026-08-04): richer return `{text, truncated?}` instead of a side option; probe by asking backend for one row more than window (`-S -(N+1)` tmux); absent not false. Stream: first put on stderr, corrected same day to stdout trailing field `omitted-rows` after capture; "annotating on stderr put the answer where its reader never looks". Final: `truncated true` field + help. Raw capture stays byte-identical.
- figma pagination: `PaginatedResult` `{rows..., next_cursor, truncated, page_count}`; six Figma pagination models normalised; command only advertises flags its endpoint supports ("so a command cannot advertise a --cursor its endpoint does not have"); `--all` + `--max-pages` (default 10) ceiling; `Stopped at --max-pages after N pages.`

### B9. TTY vs agent detection
- No GitHub-sourced repo detects TTY. The decision is by explicit format, not TTY: default TOON/--format everywhere; mux reserved an `agent` format (unused). Nothing in buddy/figma/slack/asana switches on `process.stdout.isTTY`. (Gap: no precedent to reuse.)

### B10. Ambient context (AXI #7)
- Deferred/out-of-scope in mux, universal-plugin (ADR-0003), cyberplace (#74). Charter reason: session-hook wiring and skills cross package boundaries.
- Done in asana (PR #110): `setup hook` command installs a session-start hook (`setup hook --dry-run` smoke-tested), plus init-asana skill recommending MCP as ambient integration.
- buddy-agent-harness: doctor SKILL.md generated from `doctor-guidance.ts` (single source for findings, help, skill text); `pnpm skill:doctor:check` in verify fails if skill stale; skill launcher prints `npx -y buddy-agent-harness ...` since a skill may be installed without binary on PATH. Doctor is read-only to be safe in SessionStart hook.
- Skill routing lesson (universal-plugin #64): doctor skill description triggered only on absence/staleness; fixed by naming symptoms (`built 0`, "nothing to build", `No vendors declared in harnesses`).

---------------------------------------------------------------------------
## C. PER-SOURCE LOG (date, resolution)

| Source | Date | Finding | Resolution |
|---|---|---|---|
| GitHub: cyberuni/cyber-asana#80 | 2026-06-25 | First full AXI rollout (`--toon`, count summary, exit codes 3-6, content-first, `--full`, text-only hints) on tasks only; MCP `CYBER_ASANA_MCP_FORMAT=toon`. 386 tests. Note: refused to install `no-mistakes` third-party daemon unattended. | merged |
| GitHub: cyberuni/cyberplace#74 | 2026-07-05 | Adopts AXI #1-6, #8-10; #7 deferred; "impl trails contract" banner; impl gate withheld. | merged |
| GitHub: cyberuni/cyberplace#76 / PRs #180, #187/#89 | 2026-07-05 -> 07-13 | Tavern AXI surface built (TOON `crews[N]{name,description,recruit}:` + `N crews`; `... +N lines - rerun with --full`; `0 crews found`; next-step `-> cyberplace add <name>` on stderr; unknown flag exits 1); malformed manifest fails loud `Could not parse marketplace manifest at <path>: ...` exit 1. plugin build: `vendor, path, status` TOON table, `built N, skipped M, failed K`, stderr `-> universal-plugin plugin validate`. | closed; later contradicted on stream and usage exit code by mux (07-17) |
| GitHub: cyberuni/universal-plugin/packages/universal-plugin/.agents/spec/design/decisions/0003-adopt-axi.md | 2026-07-04 | ADR: TOON default, json stays, stdout = machine result incl. aggregate, stderr = next-step/warnings/structured errors. (Path in the task brief was design/decisions/0003-...; real path is under packages/universal-plugin/.agents/spec/.) | accepted; errors-on-stderr is the position later diverged from |
| GitHub: cyberuni/cyber-mux#36, PR #37 | 2026-07-17 | Errors to stdout, stable `code` + `help:`, usage errors exit 2, unknown flag lists valid flags; one `fail()` helper with 22 call sites so one pass. Method lesson: three spec-judge rounds, first two failed because the CR itself restated AXI wrongly; fix = read upstream AXI spec directly, never a repo's restatement. | closed 07-17 |
| GitHub: cyberuni/cyber-mux#40, PR #41 | 2026-07-17/18 | Two suggestions still on stderr; moved to stdout `help[N]:` `{message,command}`, `printHelp()`; `layout save` stdout became structured (breaking). | closed 07-18 |
| GitHub: cyberuni/cyber-mux#42, PR #49 | 2026-07-18 | Raw backend text leak in `worktree-failed` catch-all. | closed 07-18 |
| GitHub: cyberuni/cyber-mux#95, PR #96 | 2026-07-25 | `missing-pane` error with candidates, exit 2. | closed 07-27 |
| GitHub: cyberuni/cyber-mux PR #104 | 2026-08-04 | read truncation reporting; flag naming collision with `--full`; stdout not stderr; `--lines`/`--full` merge. | merged |
| GitHub: cyberuni/gherkin-cli PR #12, #14 | 2026-07-18/19 | Errors, hints, empty states to stdout (agent saw empty stdout + exit 1 before); exit 2; self-correcting flags; content-first; collapse batch file lists. | merged |
| GitHub: cyberuni/cyber-asana#94 -> PR #110 | 2026-07-20 -> 08-04 | 10-principle scorecard: 2 pass, 5 partial, 3 fail; two concrete bugs (acks ignore --json/--toon; Next offset hint) plus rollout to 11 domains; 478 tests. | closed 08-04 |
| GitHub: cyberuni/cyber-asana#120 | 2026-08-08 | Wrong-app-type credential diagnosable. | closed |
| GitHub: repobuddy/buddy-agent-harness#9, PR #21 | 2026-08-15/17 | doctor read-only, TOON via shared writer extracted to `src/command-output/`; AXI 5, 7, 9; errors on stderr (deliberate departure from section 6). | merged |
| GitHub: repobuddy/buddy-agent-harness#61, PR #71 | 2026-08-18 | callable `run(argv)`; errors belong on stderr; stale version. | closed 08-19 |
| GitHub: repobuddy/buddy-agent-harness PR #60 | 2026-08-18 | help = `{command, instruction}` split. | merged |
| GitHub: repobuddy/buddy-agent-harness#69 | 2026-08-19 | spec backfill: shared output layer node `cli/command-output`. | closed |
| GitHub: repobuddy/buddy-agent-harness PR #128, #166, #204 | 2026-09-17..09-30 | governance/reference commands: `show` writes document verbatim by default; json/toon wrap; `reference show` contract table: found text -> stdout doc, warnings stderr, exit 0; missing -> nothing on stdout, `error:` on stderr, exit 1; `--format json|toon` always an ARRAY one entry per name, `status found|missing|ambiguous`, `suggestions` on a miss, `plugins` on ambiguity, `trace` with --trace. `--overrides-only` exit non-zero (exit code is the API) writing nothing to stdout. `reference create --dry-run` prints path + exact content; warnings in `warnings` field for json/toon, stderr in text; refuses with no `--force`. | merged |
| GitHub: cyberuni/universal-plugin PR #64 | 2026-09-08 | `built 0` exit 0 dangerous; exit rule; skill description routing. | merged |
| GitHub: cyberuni/universal-plugin PR #84 | 2026-09-14 | `plugin validate`: TOON, `N schema violations, M vendor violations`, 20-row cap + `--full`, stderr last line `-> universal-plugin plugin build`; bare `plugin` validates. | merged |
| GitHub: cyberuni/cynapse PR #40, #41 | 2026-10-05 | stable codes + stdout errors; follow-ups open. | #41 open |
| GitHub: cyberuni/cyberplace#357 | 2026-07-22 | Spec-tooling: AXI is "convergence" (N nodes share title) not duplication; scenario titles like `an unknown flag fails loud` and `--help prints a concise reference` recur in every AXI-following command. Meta lesson: shared conventions show up as repeated scenario titles. | open |
| GitHub: cyberuni/cyber-truss#12 | 2026-09-08 | backlog item "adopt axi/TOON" cites a nonexistent ADR docs/adr/0001 "commits to structured --json". Not an AXI behavior issue. | open |
| GitHub: cyberuni/cyber-figma (AGENTS.md, packages/cyber-figma/src/{cli-error,cli-usage,default-command,idempotent-delete,output,truncate,figma-error}.ts, apps/web/src/content/docs/cli/index.md) | main @ 2026-10-05 | Full contract described in B1-B6; text default, `--toon`; stderr errors; exit 0-7. | n/a |
| GitHub: cyberuni/cyber-slack readme.md | main @ 2026-09-05 | Says "Follows the AXI (API + CLI + MCP) pattern." A DIFFERENT meaning of the acronym than kunchenguid/axi (Agent Experience Interface). No AXI output code in repo (no toon/truncate/exit-code logic; only `-l, --limit` flags with defaults, e.g. users 100, conversations 20/100, channels 100, usergroups). Lesson: name collision; do not assume cyber-slack conforms. | n/a |

---------------------------------------------------------------------------
## D. LESSONS / BUG CLASSES (for the shared package design)

1. Stream placement bug class: every repo that wrote hints/errors to stderr lost them for agents (gherkin-cli: "empty stdout and exit 1 - no reason, no recovery path"). Package should ship one `emit` API that puts error + help + empty state on one stream and diagnostics on the other, and test it with `2>/dev/null`.
2. Restating the spec drifts: mux dropped exit 2 and widened #8; fix = the shared package encodes AXI, repos stop restating it. (GitHub: cyberuni/cyber-mux#36)
3. A helper is only AXI-conformant if every command goes through it: asana's helpers existed but only tasks used them (#94). Provide a single `output()` entry; lint for direct console.log.
4. Hints must be gated by format and parameterised: text-only vs in-payload (A5); placeholders `<files...>`; omit when output is self-contained (mux #9 omit rule: `exists` and detail views earn no hint).
5. Usage errors need command context (Commander `exitOverride`, command tag, valid flags incl. inherited); action-handler errors lack it.
6. Exit-code design: choose one of (a) AXI 0/1/2 + string `code`, (b) extended numeric table (asana/figma 3-7). Document it as contract.
7. TOON tables: keep all columns present; empty string over absent key.
8. Absent-vs-false: omit fields for "not asked/unknown" rather than `false`.
9. Idempotent mutation result carries `already_absent`/no-op flag; exit 0 on no-op.
10. Empty != failure, but "input not read" must not look like empty (universal-plugin #64).
11. `--full` is the sole escape hatch for CLI-side elision; don't overload it (gherkin-cli) or compete with a backend-window flag (mux `--lines`).
12. Hint for batch commands: don't echo input lists.
13. Version from manifest; bin path with `~`; fallback to package name.
14. Structured-by-default can break shell composition (`layout save` path); ship a changeset and document the `--format json | jq` replacement.

## E. Not read / limits
- Did not read bodies of the many "Version Packages" / dependency PRs matched by "toon" (noise). cyber-asana PRs #236/#192 and agent-harness #49 matched only because they mention TOON in passing (agent-harness #49 exports `./command-output` encoders and makes `@toon-format/toon` a runtime dependency: rule changed from "zero runtime deps" to "no agent-layer deps", 2026-10-04).
- cyberlegion PRs (#163, #73, #41, #14, #138, #12) matched "toon" only in search; not read (other agents cover local cyberlegion checkout).
- cyberfleet, cyber-sdd, cyber-truss only had incidental matches.
