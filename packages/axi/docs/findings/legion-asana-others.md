# AXI catalogue: cyberlegion, cyber-asana, universal-plugin, cynapse, cyber-truss, cyberfleet

Date of survey: 2026-10-05. Repos under ~/code/cyberuni/. All paths relative to the repo unless absolute.
AXI = https://github.com/kunchenguid/axi#the-10-principles (1 token-efficient/TOON, 2 minimal default schema, 3 truncation+--full, 4 pre-computed aggregates, 5 definitive empty state, 6 structured errors/exit codes/no prompts/idempotent, 7 ambient context (session hook), 8 content-first bare invocation, 9 next-step hints, 10 consistent help).

======================================================================================================
## 0. Cross-repo summary (read this first)

| Concern | cyberlegion (+cyberfleet) | cyber-asana | universal-plugin | cynapse (+cyber-truss, older subset) |
|---|---|---|---|---|
| Default format | TOON (home-grown encoder) | TEXT (human); `--toon`, `--json` opt-in | TOON via `@toon-format/toon`; `--format json` | TEXT; `--json` only (no TOON) |
| Format flag | `--format toon\|json` (commander `.choices`, default toon) | `--toon` / `--json` booleans, read from `process.argv` | `--format <toon\|json>` + hidden deprecated `--json`, read from `process.argv` | `--json` boolean, sets module-level format in preAction hook |
| Count/aggregate line | last line of TOON list: `N <things>` e.g. `2 units`, `1 messages (1 unread)` | text-mode only: `printSummary`/`printCountSummary`, e.g. `\n3 task(s): 2 incomplete, 1 done` | a `summary:` field INSIDE the TOON payload: `summary: "built 2, skipped 0, failed 0"` | none (JSON has `count`) |
| Empty state | `name[0]{cols}:` header + `0 <things>` line (inbox: `0 messages (0 unread)`); exit 0 | `0 results` / `0 <entity> found` (text); structured modes give `[]`/`name[0]:` | e.g. `nothing to build`, `0 entries` aggregate, exit 0 | `0 <entity> found`; JSON `{count:0,entity,items:[]}` |
| Next-step hint | `→ <cmd>` on STDERR, one per line, only when actionable | `\nNext steps:\n  - <cmd> — <why>` on STDOUT, text mode only | `→ <cmd>\n` on STDERR, every command ends with one | none (open issue #41 asks for it) |
| Error stream | STDERR, `{"error":"msg"}` JSON always (even in toon mode), exit 1 | STDERR, text `Error: msg\nHint: ...` / JSON / TOON by selected format | STDERR, bare message (plain text; no JSON error despite spec) | STDOUT (since 2026-10-04), `error: msg` / `{"error":{code,message,...details}}` |
| Exit codes | 0 / 1 (plus 1 for trust-blocked spawn; await timeout = 1) | 0,1,2 usage,3 auth/config,4 403,5 404,6 429,7 402 plan | 0 / 1 | 0,1,2 usage,3 timeout,4 ambiguous,5 unknown address |
| Truncation | only `agent show` instructions: 200 chars + `… (N chars total, pass --full)` (applied to JSON too) | `truncate()` 500 chars + `… [truncated, N chars total; use --full for the rest]`, text only | validate violations > 20: `… +N more — rerun with --full` | none |
| TTY detection | none for output; only `mail hook` checks `!process.stdin.isTTY` to read harness JSON | none (format is flag-driven, never TTY-driven) | none | none |
| Env vars | `CYBERLEGION_ROOT`, `CYBERLEGION_AGENT_ID`, `CYBER_MUX`, `CYBER_MUX_PANE` | `CYBER_ASANA_MCP_FORMAT=toon`, `ASANA_ACCESS_TOKEN`, `ASANA_WORKSPACE` | none output-related | `CYNAPSE_PARTICIPANT`, `CYNAPSE_HOME` (none output-related) |
| Spec-backed? | yes: per-node README + .feature, ADR-0024 (CLI shape only), AGENTS.md | yes: `.agents/spec/axi/README.md` (reference node) | yes: `.agents/spec/axi/README.md` + ADR-0003 + ledger | docs concept page + AGENTS.md + changesets, no spec node |

NO repo does TTY-vs-agent auto-detection. All use explicit flags. No repo has `--fields`; cyber-asana has `--opt-fields` (Asana API field selection) and `--full`; universal-plugin has `--full`; cyberlegion has `--full` on one command only.

DIVERGENCES THAT @clibuilder/axi MUST DECIDE:
1. Where hints/errors go: cyberlegion + universal-plugin put hints on stderr, cyber-asana puts them on stdout (text mode only), cynapse put ERRORS on stdout citing AXI §6 ("agents read stdout, not stderr") - decided by "the Council" 2026-10-04 (commit 05437cc), after first doing stderr one commit earlier (fa5c956). cyber-asana's own spec records "errors go to stderr, where AXI asks for stdout" as a KNOWN GAP. So: upstream AXI says errors on stdout; 2 of 6 repos know this; cyberlegion/universal-plugin still use stderr.
2. Default format: TOON-first (cyberlegion, universal-plugin, cyberfleet) vs text-first (cyber-asana, cynapse, truss). cyber-asana's spec explicitly records its text default as a "deliberate divergence".
3. Aggregate line inside vs outside the data: cyberlegion appends a non-TOON prose line to stdout after the TOON block (so JSON mode omits it by emitting a different payload); universal-plugin embeds `summary:` as a TOON/JSON-view key (cleaner, parse-safe); cyber-asana prints aggregate only in text mode. universal-plugin's is the most parse-safe.
4. Format-flag shape: `--format toon|json` (legion, UP, fleet) vs `--toon`/`--json` (asana) vs `--json` (cynapse). `--json` kept as hidden alias in UP.
5. JSON payload vs TOON payload: universal-plugin deliberately gives JSON the FULL structured shape and TOON a "view" (3-4 columns + summary); cyberlegion also supplies two payloads per call (`{toon, json}`), JSON usually the full record. cyber-asana: both modes serialize the same data.

Most evolved / best-evidenced (my read):
- Output helpers + tests + e2e: cyberlegion (output.ts is tiny but has ~1000-line e2e suite that asserts stdout vs stderr vs exit code from the real built binary; spec .feature scenarios per behavior).
- Fullest contract + error model: cyber-asana (spec node, 7 exit codes, usage-error body with valid_flags, idempotent-delete helper, MCP surface, SessionStart-hook installer, 478 tests) - but spec lags code (usage->exit 2 and 402->7 are in code/AGENTS.md/docs but spec still says "no distinct usage-error exit code").
- Newest thinking: cynapse (2026-10-04/05) - errors on stdout, stable error `code` taxonomy, `details` merged into error JSON, open issue #41 for next-step-on-error + valid flags + bare-group usage on stdout.
- Best TOON encoder: cyber-asana `src/toon.ts` (own, 121 lines, tested, handles quoting/nesting/list-block) or the official `@toon-format/toon` (UP, cyberfleet lockfile 4.1.1 via cyberlegion? see below). cyberlegion's encoder is NOT spec-complete TOON (see 1.4 quirks).

======================================================================================================
## 1. cyberlegion  (cyberuni/cyberlegion) - main focus

Files: packages/cyberlegion/src/output.ts (59 lines), src/cli.ts (1365), src/cli.e2e.test.ts (1069), docs/adr/0024-cyberlegion-cli-node-alignment.md, AGENTS.md:172-179 ("Agent-friendly output"), apps/web/src/content/docs/cli/index.md:29-35, specs under packages/cyberlegion/.agents/spec/{unit/registry,mail/core,mail/surface,agent,attach,mux}/.
Relevant commits: 5f613df/1a04701 (2026-07-05, CR-2/4b mechanism + agent group, first TOON use), 69a11ce (2026-07-05 "bare invocation prints compact status, exit 0 (AXI #8)"), 11351ef (CR-6a: narrow lib façade; exports AXI helpers), 3904faf (cyberfleet repointed onto cyberlegion), 3677016 (2026-07-09 ADR-0024), 1c258b8 (2026-07-25 mux verbs verified), a4be206/e6669b7/003c786 (Aug spec-binding work on "absence" assertions and "exits 0" clauses), 411027a (2026-09-08 `unit close --keep-worktree`), ff513b7 (2026-09-27). No PRs/issues mention "axi" (gh search empty).

### 1.1 Helper API (src/output.ts, the entire AXI surface)
```ts
export type Format = 'toon' | 'json'
export function toonObject(fields: Record<string, unknown>): string      // `key: value` lines; null/undefined fields DROPPED (not 'null')
export function toonList<T>(name: string, items: T[],
  fields: { key: string; get: (item: T) => unknown }[], summary: string): string
export interface EmitPayload<T = unknown> { toon: string; json: T }
export function emit(format: Format, payload: EmitPayload): void        // json -> console.log(JSON.stringify(json,null,2)); toon -> console.log(toon)
export function nextStep(msg: string): void                               // console.error(`→ ${msg}`)
export function fail(msg: string): never                                  // console.error(JSON.stringify({error:msg})); process.exit(1)
```
- Re-exported to siblings: `src/index.ts:40-42` "AXI output helpers (so a sibling emits the same TOON/next-step contract)": `emit, fail, nextStep, toonList, toonObject`. cyberfleet imports them (cyberfleet AGENTS.md:141-144, src/cli.ts).
- Header comment output.ts:1-3: "AXI-shaped CLI output: TOON default (compact, aggregate-first), `--format json` escape. stdout carries the machine result only; stderr carries next-step / warning / error lines".
- Cell escaping (output.ts:7-11): `stringifyCell` null->'' ; quote with `"` and double inner quotes only if cell contains `,` newline or `"`. (Note: a `\n` in a quoted cell is still a literal newline.)

### 1.2 Output shape (literal)
List (cli.ts:906-925 `emitInbox`; rows indented 2 spaces; summary line NOT indented):
```
messages[1]{id,from,subject,read}:
  m1,alice,hello,false
1 messages (1 unread)
```
then on stderr: `→ cyberlegion mail read <id>` (first unread only). `unit who`: `units[N]{id,handle,harness,status,pane}:` + `N units`; stderr `→ cyberlegion unit register to join` when 0. Object: `toonObject` -> `id: abc\nhandle: alice\nharness: claude\nstatus: active`. Bare invocation: `self: alice\nharness: claude\nunread: 1\nunits: 1`.
- Counts-line syntax per list: `N units`, `N pruned`, `N standing`, `N messages (U unread)`, `N agent definitions`-ish (agent list; spec "reports 0 agent definitions"), `N projects`. Plural is NOT adapted ("1 messages").
- Pluralization lesson: none attempted ("1 messages (1 unread)" is canonical, asserted in e2e/spec: mail/core.feature:55-59 'the aggregate line reads "2 messages (2 unread)"').
- Mutation acks: single-key objects: `acked: m1\nfrom: ..\nsubject: ..`, `deleted: <id>`, `presence: none`, `mainPane: none`, `cleared`, `nudged`, `focused`, `stopped/pane/verified/already`. Verb-named first key = the result ("spawned: <id>", "rebound: <id>").
- JSON mode: `emit(...).json` is usually the raw record(s) (`json: items`, `json: rec`), NOT the TOON-view (e.g. status `json: {self: {id,handle,harness}|null, unread, units}` vs toon `self: alice`).

### 1.3 Empty states / idempotency / no-op messaging
- AGENTS.md:177: "`toonList` is definitive on empty - it still emits the `name[0]{...}:` header plus a summary line, never a blank line." e2e cli.e2e.test.ts:109-112 `who reports a definitive empty state` expects `0 units`; :549 inbox empty expects `0 messages (0 unread)` exit 0.
- Absent bound pane is a definitive `none` not an error: `attach --show` -> `mainPane: none` (cli.ts:1220), `unit claim --show` -> `presence: none` (:209); `--clear` is "a no-op when nothing is bound" (:197, :1214) and prints `presence: none`.
- `mail read --ack` idempotent: second call "still prints the body and exits 0 (no double-ack error)" (e2e :543, :765); output includes `acked: true|false`.
- `unit stop`: object includes `already: <bool>`; nextStep only `if (!res.alreadyStopped)` (cli.ts:455-470).
- `mail hook`: empty inbox -> prints NOTHING, exit 0 (e2e :717); unregistered caller exit 0 on every degraded path (e2e :598-710; commit notes "the 'exits 0' clause in-process bindings cannot see" - test lesson: only a real process shows exit codes, so e2e tests spawn the built binary).
- `unit register --standing` bare (no --handle) lists standing owners instead of erroring.

### 1.4 Known quirks / weaknesses (worth NOT copying)
- toonObject does `${v}` with NO quoting/escaping: a multi-line `body` (mail read) or a value containing `:` is emitted raw -> not round-trippable TOON; nested/array values stringify as `[object Object]`/comma-joined. cyber-asana's toon.ts and the official lib handle this.
- Summary line is free prose appended after the table, not valid TOON; consumers that want machine counts use `[N]` in the header.
- `fail()` calls `process.exit(1)` inside command code (cyber-asana/cynapse forbid this and throw instead); JSON error always, never text.
- "Warnings": raw `console.error(text)` with no prefix (e.g. `a live session already claims handle "x"`, `first-turn doorbell not confirmed (peer still spawned; nudge it manually): ...`, effort-not-applied warning cli.ts ~330). Next-step warnings use `nextStep('warning: ...')` -> `→ warning: ...` (cli.ts:494).

### 1.5 Error shape, exit codes
- `fail(msg)` -> stderr `{"error":"<msg>"}` (single line, compact JSON, string not object), exit 1. Top-level `runCli` catch (cli.ts:1358-1365) does the same for any thrown error (`console.error(JSON.stringify({error: message})); process.exit(1)`), so uncaught errors and `fail()` look identical. Always JSON even under `--format toon`. e2e :624 asserts `JSON.parse(res.stderr).error` for rejected `--event`.
- Messages are imperative/actionable: `no identity in this session — run \`cyberlegion unit register\` first` (cli.ts:93), `"<id>" is not a message in this inbox`, `no reply on thread "t" within 600000ms`, `--allow-cli applies to claude only, not cursor`, `could not detect harness — pass --agent claude|cursor|codex`.
- Exit codes: only 0 and 1. Partial-failure variant: `reportTrustBlocked` (cli.ts:365-373) prints the failure + the "then:" repair command on stderr and sets `process.exitCode = 1` AFTER the spawn landed (stdout still carries the `spawned:` object). Lesson in its doc comment: "A spawn left at its harness's folder-trust prompt is a failure the caller must see, not a best-effort warning".
- `mail await` three-outcome contract (cli.ts:988-1035, help text via `addHelpText('after')`): matched -> exit 0, message on stdout and acked; waiting -> exit 0, stderr `waiting — no reply on thread "T" within --max-wait Ns; re-run to keep waiting`, nothing on stdout (the `--max-wait` default 240s self-cap exists so the caller can re-arm before a harness tool-timeout); timed-out -> exit 1 via fail(). `--timeout` default 600000ms, 0 = forever.
- Usage errors are commander defaults (`--format` is validated by `Option.choices`); no special exit code 2.

### 1.6 Next-step hints (exact syntax; ALL on stderr via nextStep, `→ ` prefix, one per line)
- `→ cyberlegion mail read <id>` (inbox, first unread), `→ cyberlegion mail inbox --unread` (bare status when unread>0), `→ cyberlegion unit read <id>` (after spawn), `→ cyberlegion mail ack <id>[ --owner <h>]` (after peek read), `→ cyberlegion unit restart <handle>` (after stop), `→ cyberlegion unit register to join` (empty who / unregistered bare), `→ cyberlegion project register to add the current repository`, `→ add a .md file under .agents/agents/ to define one` (empty agent list; not a command), `→ start the runtime, then: cyberlegion service bind <p> <n> --generation <g> --token <t>`, `→ another caller is starting it — re-run to resolve: cyberlegion service resolve <p> <n>`, `→ export CYBER_MUX=tmux CYBER_MUX_PANE=%1 — pin the fast-path, skip ancestry discovery on later calls`, `→ cyberlegion init --allow-cli to add <rule> to Claude Code's permissions.allow, so units can mail their results back`.
- Convention: a hint is emitted only when there IS a concrete follow-up (conditional, e.g. unread>0), after emit(), and hints may carry a trailing human gloss after ` — `. Hints are NEVER in stdout (so `--format json | jq` is clean).

### 1.7 TTY / agent detection, env, flags
- No output TTY detection. `mail hook` only: `if (!process.stdin.isTTY) recordConversation(readFileSync(0))` (cli.ts:1059) - a human at a terminal pipes nothing, a harness pipes JSON.
- `mail hook` payload: raw single-line JSON in the harness `hookSpecificOutput` shape on stdout, deliberately NOT TOON (cli.ts:1052 description; spec mail/surface/README.md:65, surface.feature:234 "it is not TOON-formatted"; e2e :557 "a TOON payload throws here"). Rejects retired `--event PostToolUse` with non-zero exit + no payload (e2e :617). Lesson: protocol payloads consumed by a harness stay raw JSON.
- Global flags (`withGlobals`, cli.ts:98-102, applied to EVERY leaf command and to the root program): `--space <path>` (isolate hub root; overrides `$CYBERLEGION_ROOT`), `--format <toon|json>` (default toon, `Option.choices`). cli.ts:~79 `.enablePositionalOptions()` so the program-level `--space/--format` (needed for bare status) don't shadow the leaf subcommands' own after the verb (commit 69a11ce).
- `$CYBERLEGION_AGENT_ID` identity override; `CYBER_MUX`, `CYBER_MUX_PANE` pin multiplexer.
- Truncation: `agent show` (cli.ts:1075-1131): `INSTRUCTIONS_PREVIEW_LEN = 200`; `truncated(text, full?)` -> `${text.slice(0,200)}… (${text.length} chars total, pass --full)`; applied in toon AND in json (`json.instructions` truncated unless --full; `--full` flag at :1120). `agent resolve` emits the full machine payload (no truncation). Unlike cyber-asana, truncation reaches JSON.
- Help: commander help; `mail await` has an "after" help block describing outcomes. Bare invocation shows STATUS not help (see 1.8). Other commands' help is plain commander.
- Aliases kept for hot path: top-level `who`, `send`, `inbox`, `spawn` (ADR-0024 impl notes).

### 1.8 Bare invocation (AXI #8) - commit 69a11ce, spec unit/registry README.md:246 & ~528, identity.feature scenarios (now registry.feature)
`cyberlegion` with no subcommand: prints `self`, `harness`, `unread`, `units`; exit 0 even when unregistered (`self: -`, `harness: -`, `unread: 0`) and then `→ cyberlegion unit register to join`; `--format json` -> `{"self":null,"unread":0,"units":0}`. e2e :353-370. Rationale in commit: bare invocation "printed commander help and exited 1"; AXI #8 wants live data + exit 0.

### 1.9 ADR-0024 (docs/adr/0024-cyberlegion-cli-node-alignment.md, Proposed, 2026-07-09)
Not about output format. Relevant lesson: "For a CLI, 'capability' (the folder axis) IS the command group - the surface an agent actually types, arranged for AXI friction"; spec nodes = command groups (+ real layers like mux); breaking rename (identity->unit, owner->register --standing, bind-main->attach, doctor/mode->mux) with hot-path aliases `who/send/inbox/spawn` and bare status preserved. Docs (apps/web .../cli/index.md:31-33): "There is no `--format text`; `toon` already reads as plain text."

======================================================================================================
## 2. cyber-asana (cyberuni/cyber-asana) - main focus

Files (packages/cyber-asana/src/): output.ts (79), toon.ts (121), truncate.ts (16), pagination.ts (94), cli-options.ts (104), cli-error.ts (43), cli-usage.ts (~103), idempotent-delete.ts (37), default-command.ts, setup-cli.ts (94), mcp-output.ts, mcp-error.ts, tasks/cli.ts (reference domain). Spec: packages/cyber-asana/.agents/spec/axi/README.md (reference node, spec-type: reference, concept tags `axi, output-contract`; every domain node says "adopted here rather than re-decided"). AGENTS.md:113-124 ("Agent-friendly output"). Docs: apps/web/src/content/docs/cli/index.md:48-135.
Key history: issue #94 (2026-08-04) "AXI conformance: output helpers exist but only the tasks domain uses them" - a scorecard of the 10 principles (2 pass, 5 partial, 3 fail) -> PR #110 (merged 2026-08-04, "roll AXI output conventions out to every domain", one commit per checklist item + one per domain; 392 -> 478 tests); `6fbec33` setup hook (AXI #7); `e9fad31` mutation acks through output(); `c64c9e6…` per-domain list rollouts; `57860fc`/`e962819` spec backfill (PR #96, 2026-07-19/20); `1549fa5` task get --with-stories (2026-10-03, most recent). Lessons from #94: (a) helpers existing is not adoption - 1 of ~20 list commands used default optFields, truncate() had one call site, `--full` was a no-op elsewhere; (b) ~18 mutation acks printed prose regardless of --json/--toon (a bug); (c) `Next offset:` helper was ungated; (d) empty state was bare `0 results` because no caller passed the entity; (e) every `--x-gid` also registers a legacy `--x` alias, doubling flag surface, and same-named flags mean filters in `task search` (agents get this wrong).

### 2.1 Helper API (src/output.ts - exact)
```ts
export type OutputFormat = 'json' | 'toon' | 'text'
export function selectFormat(argv: string[] = process.argv): OutputFormat   // --toon wins over --json; default 'text'
export function output(data: unknown, readable: () => void, argv = process.argv): void  // toon->console.log(encodeToon(data)); json->JSON.stringify(data,null,2); text->readable()
export function printEmpty(entity?: string): void                    // `0 ${entity} found` | `0 results`
export function printFields(fields: Record<string,string|null|undefined>): void  // 2-col `key  value` padded; null dropped
export function printTable<T>(items: T[], cols: {label:string; get:(i:T)=>string}[], opts?: {entity?: string}): void
   // empty -> printEmpty(entity); else UPPERCASE header, dashed rule, padded rows (2-space gutters)
export function printSummary(line: string, argv?): void              // text mode only
export function printCountSummary(count: number, noun: string, argv?): void  // text only; count 0 prints nothing; prints `\n${count} ${noun}`; noun carries own plural e.g. 'project(s)'
export function printNextSteps(steps: string[], argv?): void         // text only; '\nNext steps:' + '  - <step>' lines; nothing if empty
// src/truncate.ts
export function isFull(argv = process.argv): boolean                 // argv.includes('--full')
export function truncate(value: string|null|undefined, opts?: {limit?: number; full?: boolean}): string  // DEFAULT_TEXT_LIMIT=500
// src/toon.ts
export function encodeToon(value: unknown): string
// src/idempotent-delete.ts
export type DeleteResult = { deleted: true; resource: string; gid: string; already_absent: boolean }
export function deleteIdempotently(resource: string, gid: string, remove: () => Promise<unknown>): Promise<DeleteResult>  // swallow 404 only
export function deleteMessage(result: DeleteResult, label: string): string  // 'Task 12 was already deleted' | 'Deleted task 12'
// src/cli-error.ts
export function exitCodeFor(error: unknown): number
export function renderCliError(error: unknown, format: OutputFormat): string
// src/cli-usage.ts
export function installUsageErrors(program: Command): void   // exitOverride+suppress writeErr on every command, tags err with .command
export function isUsageError(e): e is UsageError; isCleanCommanderExit(e) (help/version => exit code from commander, 0)
export function validFlags(cmd): string[]; commandPath(cmd): string; buildUsageErrorBody(err); renderUsageErrorText(err)
// src/cli-options.ts
parseLimit (1..100), addPaginationOptions(cmd, {limit?,optFields?}), paginationOptionsFromCli (rejects --all with --offset), addReadOptions (--opt-fields on `get`), printNextPageHint(result, argv?), addGidOption(cmd, base, desc, {env?, legacyAlias?}), normalizedGid, requiredGid
// src/pagination.ts: PaginationOptions{limit,offset,optFields,fetchAll,maxPages}; ListResult<T> = T[] | PaginatedResult<T>; collectListResponse; listItems; nextPageOffset
```
Format selection is by scanning `process.argv` (so helpers work in deeply nested commands without plumbing). Principle references are in `// principle N` comments in source.

### 2.2 TOON encoder (src/toon.ts) - behavior (tests toon.test.ts: 13 cases)
- Flat object -> `key: value`; nested object -> `key:` + 2-space-indented block; empty object `{}`; empty array `key[0]:`; scalar array inline `key[N]: a,b,c`; uniform array of scalar-valued objects -> `key[N]{f1,f2}:` + one 2-space row per item; non-uniform -> list block `key[N]:` with `- ` entries; top-level uniform array is tabular.
- Quoting (`needsQuote`): empty string, leading/trailing whitespace, any of `, : " \n`, reserved `true|false|null`, numeric-looking strings that would NOT round-trip through JSON number (leading zeros / precision loss) -> JSON.stringify'd. Plain integer strings like GIDs `123` stay UNQUOTED "to keep GID-heavy output token-efficient". null/undefined -> `null`.
- Claimed saving ~40% vs pretty JSON (docs).

### 2.3 Output shapes (literal)
- Default text list (task list): table `GID  NAME  ...` then `\n3 task(s): 2 incomplete, 1 done` then (if more pages) `\nNext offset: <offset>` then `\nNext steps:\n  - cyber-asana task get <gid> — view a task\n  - cyber-asana task update <gid> --completed — complete a task`. Hint line format: `<exact command> — <short why>`.
- `--toon`/`--json` of a list = raw data (bare array when no pagination flags; `{data,next_page,limit,page_count?,truncated?}` envelope as soon as --limit/--offset/--all is given - `shouldReturnPageMetadata`, pagination.ts:36). Aggregates/hints are SUPPRESSED in structured modes ("a structured consumer computes its own aggregate and a stray prose line in a JSON stream is a parse hazard"; tested output.test.ts "stays silent in structured modes").
- Mutation acks go through `output(payload, readable)`; delete -> `{deleted:true,resource,gid,already_absent}`; text `Deleted task 12` / `Task 12 was already deleted`.
- Count syntax: `N task(s): X incomplete, Y done`; generic `N <noun>` e.g. `4 story(s)` - uses the `(s)` plural marker, supplied by caller.

### 2.4 Empty states
`0 <entity> found` (entity named; e.g. `0 tasks found`) or `0 results`; never `(none)` or blank ("an agent cannot distinguish a blank line from a crash"). `printTable` calls it automatically. `printCountSummary(0, ...)` prints nothing (empty state already spoke). Structured modes: empty array / `name[0]:`. Search docs: `0 results found` when nothing matches (cli/search.md:57).

### 2.5 Errors and exit codes (cli-error.ts; spec table in spec axi/README.md #6 lags code)
| Exit | Condition (code as of 2026-10) |
|---|---|
| 0 | success, `--help`, `--version` (isCleanCommanderExit) |
| 1 | generic/unclassified (+ any non-`kind:config` non-listed status) |
| 2 | usage error (Commander unknownOption/unknownCommand/invalidArgument/missingArgument/missingMandatoryOptionValue/excessArguments/conflictingOption, only when `error.command` tagged) |
| 3 | `kind:'config'` OR HTTP 401 (credentials not working; deliberately merged) |
| 4 | 403 |
| 5 | 404 |
| 6 | 429 |
| 7 | 402 (`PLAN_LIMITATION_STATUS`, "above the workspace's plan level"; carries a built-in hint) |
- Top-level catch (src/cli.ts:62-68): `installUsageErrors(program)`; on error: `if (isCleanCommanderExit(err)) process.exit(err.exitCode ?? 0); console.error(renderCliError(err, selectFormat())); process.exit(exitCodeFor(err))`. ONLY place that exits; commands throw (never `process.exit`); same normalizer is shared with MCP so "a given failure reads the same on CLI and MCP".
- STDERR (console.error) - spec lists this as a KNOWN GAP ("Errors go to stderr, where AXI asks for stdout... same gap the sibling bins carry; recorded as follow-up"). Format follows `--json/--toon/text`.
- Body (mcp-error.ts `McpToolErrorBody`): `{ ok:false, error:{ kind:'asana_api'|'config'|'internal', message, status?, errors?:[{message,help?,phrase?}], hint? } }`. Asana's own `errors[]` (help/phrase) carried through intact. `hint` can be attached by the throwing operation (`attachedHint`) and wins over status-derived hints.
- Text rendering: `Asana API error: <message>` or `Error: <message>` then `\nHint: <hint>`.
- Usage error body (cli-usage.ts:62-76): `{ ok:false, error:{ kind:'usage', code:'commander.unknownOption', message (with "error: " stripped), command:'cyber-asana task list', valid_flags:['--limit <number>', ...] (own + inherited), hint:'Run `cyber-asana task list --help` for the full reference.' } }`; text form:
  ```
  Error: unknown option '--nope'
  Valid flags for `cyber-asana task list`:
    --limit <number>
    ...
  Hint: Run `cyber-asana task list --help` for the full reference.
  ```
  An `InvalidArgumentError` thrown inside an action handler (no command tag) stays on the ordinary error path (exit 1) - tested.
- Idempotent deletes: second delete succeeds (404 swallowed, only 404), prints `already_absent: true`. Everything non-interactive; no prompts.
- Spec status (axi/README.md): says "No distinct usage-error exit code (falls to 1)" - STALE vs code (PR #110 added exit 2). AGENTS.md/docs are current. Spec also says MCP/CLI normalizer `buildMcpToolErrorBody`.

### 2.6 Truncation / pagination
- Truncation is TEXT-ONLY by design ("never silently corrupts a --json payload a machine is parsing"). Hint text exact: `… [truncated, N chars total; use --full for the rest]` (after first 500 chars). `--full` is a GLOBAL flag in help table; read via `isFull()` scanning argv. Applied to task notes, project notes, status update + comment bodies.
- Pagination: `--limit <1..100>` (default 100), `--offset <token>`, `--opt-fields`, `--all` (fetch up to `--max-pages`, default 10), `--all` with `--offset` rejected as usage error. `--all` result carries `page_count` and `truncated: true` when pages remain ("a bounded walk that admits it was cut"). Text hint: `\nNext offset: <offset>` (text-only, gated after bug in #94).
- Minimal default schema (#2): only tasks sets `TASK_LIST_FIELDS = 'gid,name,completed,due_on'` via `pagination.optFields ??= ...`; spec admits PARTIAL adoption; AGENTS.md overstates. (PR #110 claims rollout to all 11 domains; spec predates it.) `--opt-fields <comma-list>` widens; `get` commands also accept it.

### 2.7 Content-first / ambient context / help
- Bare `cyber-asana` (src/default-command.ts `runDefaultCommand`): live `me` call; text via printFields: `bin  cyber-asana`, `description  Asana CLI for AI agents`, `version  x.y.z`, `Name`, `ID`, `Email`, then `Next steps:` (`cyber-asana task my-tasks list --workspace-gid <gid> — your tasks`, `cyber-asana workspace list — your workspaces`, `cyber-asana --help — all commands`); structured: `{bin,description,version,user:{gid,name,email}}`.
- `cyber-asana setup hook [--settings <path>] [--dry-run]` (setup-cli.ts, commit 6fbec33): merges a SessionStart hook `{"type":"command","command":"cyber-asana --toon"}` into `.claude/settings.json`; idempotent (`already_installed`), preserves unrelated settings, result `{path, command, already_installed, written}`; text status `installed | already installed | not written (--dry-run)`. This is AXI #7 realized: ambient context = bare invocation in TOON on SessionStart. cyberlegion does the analog with `mail hook` + `init`.
- Help (#10): commander per-subcommand `--help`; `setup` group has "Examples:" block via addHelpText; root help advertises it. Issue #94 asked for usage examples on every subcommand (partial).
- MCP surface: JSON default; `CYBER_ASANA_MCP_FORMAT=toon` re-encodes JSON text content of every tool result (and error results) as TOON, centrally in `withMcpOutputFormat(server, env)` wrapper around `server.tool`; leaves non-JSON text untouched (mcp-output.ts, 6 tests).
- Env: `ASANA_ACCESS_TOKEN` (primary), `ASANA_TOKEN` deprecated, `ASANA_WORKSPACE`; `--token` flag.

### 2.8 Tests (the evidence): output.test.ts (format selection, toon/json/text branching, structured-mode silence for summary/next-steps/count, empty entity naming), toon.test.ts (13), truncate.test.ts, cli-error.test.ts (each exit code; render json/toon/text; hint; 402), cli-usage.test.ts (unknown flag => exit 2 + valid flags incl. inherited + json + toon; unknown subcommand; excess arg; no doubled "error:"; help is clean exit), default-command.test.ts, idempotent-delete.test.ts, mcp-output.test.ts, setup-cli.test.ts.
PRs/issues found: #94 (issue), #110 (PR), #96 (spec backfill PR), #122/#118 (status roll-up), #162 (spec skills as a domain), #101 (url suite digits). Nothing open about AXI.

======================================================================================================
## 3. universal-plugin (cyberuni/universal-plugin)

Files: packages/universal-plugin/src/output.ts (27 lines), per-command cli.ts files (build, bundle, validate, init, config, install, marketplace, version, publish, prepare, sync), cli-options.ts (ROOT_OPTION `--root <path>`, `resolveRoot`). Spec: packages/universal-plugin/.agents/spec/axi/README.md (reference node), ADR `.agents/spec/design/decisions/0003-adopt-axi.md`, ledger `.agents/spec/ledger/axi-conformance.04835d.jsonl`, behavioral nodes config/add, config/get, plugin/{build,bundle,validate,init}. Docs apps/web/.../cli/overview.md:50-70, cli/config.md.
Commits: 26bd087 (2026-07-14 absorb "AXI json output" from cyberplace; origin = cyberplace "cyberplace-marketplace-axi" PR #74 in cyberfleet, 2026-07-04), 17ab5a5/a274ac0/01bb7ac (2026-07-21 config add/get, PR #16), 76976f0/7d4e905/8f6083c (08-09/10 init, PR #28), 4e0e5ee (2026-08-16 "emit TOON as the default format": "Every command's --format help named toon as the default and the AXI contract (ADR-0003) requires it, but output.ts printed aligned tables... Encode with @toon-format/toon instead. Each command now hands output() a view payload carrying minimal row schema and aggregate summary"), f97b05c docs, 49f1036 (2026-09-13 bare `plugin` runs validate), 6036ef8 (09-07 "report deriving nothing by its cause, not as success"), ea7b5a9 (doctor), 55fdc24 (2026-09-28 removed governance command). Lesson: spec said TOON default on 2026-07 but code printed tables until 2026-08-16 - spec/impl drift of ~1 month.

### 3.1 Helper API (src/output.ts - complete)
```ts
import { encode } from '@toon-format/toon'
function getFormat(): string|undefined   // argv.indexOf('--format') -> next token; or '--json' -> 'json'
export function output(data: unknown, view?: unknown): void
   // json -> console.log(JSON.stringify(data,null,2)); else console.log(encode(view ?? data))
```
Notes: `data` = full structured result (JSON), `view` = TOON payload with minimal row schema + `summary`. Format read from raw argv (`--format` any value other than `json` => TOON, no validation except `validate`, which throws `error: --format must be "toon" or "json"`). Hint/err helpers are inline per command (`process.stderr.write('→ ...\n')`).

### 3.2 Output (literal; docs overview.md:60-70)
```
vendors[2]{vendor,path,status}:
  claude-code,.claude-plugin/plugin.json,built
  cursor,.cursor-plugin/plugin.json,built
summary: "built 2, skipped 0, failed 0"
```
- `summary` is a TOON key (string) not a trailing prose line. Examples: `built N, skipped M, failed K[, served by plugin.json C][, catalogs N]`; validate: `N schema violations, M vendor violations` (via `plural()`); `pinned P, unchanged U, skipped S`; `created C, updated U, unchanged N`; `installed I, unchanged U, blocked B, unsupported X`; `removed R, missing M, blocked B, unsupported X`; `K skipped of N` / `N targets` / `K invalid of N` (marketplace); `<key>: N entries` (config add/get); `no npm package declared` | `npm package at <path>`; version `updated N, derived D` / `planned N, updated 0 (dry run)`.
- Minimal default schema (#2): build rows = `vendor,path,status` (3 fields); catalogs = `path,status`. JSON mode returns richer object (`built[], skipped[], failed[], canonical[], catalogs, dependencyIssues, summary:{...}, warnings`). Doc: "`--format json` returns more than the default view, including every warning". config get `--format json` emits the raw stored array untouched/untruncated.
- config add TOON row: `key, name, action` (`appended|replaced`) + `<key>: N entries`; stderr `→ universal-plugin config get --key <k>`.

### 3.3 Empty / no-op
`nothing to build`-style definitive state with exit 0; `config get` absent key or empty array -> TOON with zero rows + aggregate `0 entries` (get.feature:43-61); idempotent mutations (config add returns `replaced` for same name; init `unchanged N`; install `unchanged`). ADR rule: "a signal absent" splits by cause per AXI #5 vs #6 (plan github-61): "no targets declared" = definitive empty (exit 0, next-step to doctor); "found a signal that contradicts" = structured error naming the signal (exit 1). Commit 6036ef8: don't report "built 0" as success when deriving nothing - report by cause.

### 3.4 Errors / exit codes / streams
- Spec says "structured errors (a stable `code` + message, honoring `--format`); exit 0 success, 1 failure; never prompt; unknown flag fails loud (exit 1, names the flag)". REALITY: every cli.ts catch does `process.stderr.write(\`${err.message}\n\`); process.exit(1)` / `process.exitCode = 1` - plain text, no code, no JSON (spec/impl gap). Warnings: `warn: <text>\n` on stderr; strict errors `error: N declared dependencies cannot be resolved ... (--strict-dependencies)` on stderr.
- Non-zero but data still printed: `plugin build` prints the table, then `process.exitCode = 1` if `failed > 0`; validate sets `exitCode=1` if `!valid` after printing; install/uninstall `blocked > 0` => 1; marketplace `invalid` rows => 1. Pattern: result on stdout always, exit code reflects verdict.
- Stream discipline (ADR-0003 + spec): stdout = machine result including aggregate; stderr = next-step line, warnings, errors. "`--format json | jq` and TOON parsing stay clean".
- Unknown flag: relies on commander default (exit 1); spec claims "naming the flag".
- No prompts: `plugin init` non-interactive by default; `--yes` kept as compat no-op (ADR-0003 consequences; ADR-0005 explicitly rejected "make the CLI interactive when attached to a TTY - contradicts ADR-0003/AXI" - the clearest TTY stance in any repo: do NOT branch on TTY).

### 3.5 Next-step hints (stderr, `→ ` prefix, trailing `\n`, one per command)
`→ universal-plugin plugin validate`, `→ universal-plugin plugin build`, `→ universal-plugin plugin init` (on "No plugin.json found"), `→ add skills to skills/, then run universal-plugin plugin build`, `→ review and commit the pinned skills`, `→ re-run without --dry-run to apply`, `→ universal-plugin plugin bundle`, `→ /universal-plugin:doctor-universal-plugin — diagnose why nothing is declared` (slash-skill hint, build with nothing built) / `... — check the built manifests against plugin.json`, `→ universal-plugin marketplace validate[ --root X]`, `→ fix <field> in plugin.json: <first violation message>, then rerun universal-plugin plugin validate` (validate failure; points at the FIRST violation because the full list is already on stdout), `→ set packagePath in .agents/universal-plugin.json to ship through npm`, `→ <vendor>: <reload instruction>` (install). Hints are computed by a function of the result (e.g. `nextStep(result, cwd)` in build/cli.ts:~10-25), so they adapt to outcome. Spec rule (#9): "every command ends with a next-step line".

### 3.6 Truncation
validate: `TRUNCATE_THRESHOLD = 20` rows per violation list (also in bundle); extra rows replaced by TOON key `truncated: "… +N more — rerun with --full"` (spec text: `… +240 lines — rerun with --full`); `--full` lifts. Truncation is part of the TOON view only; JSON is complete.

### 3.7 Content-first / help
- Bare `plugin` group runs `validate` (shows live status + `harnesses`) - src/validate/cli.ts `runValidate(opts, {withHarnesses:true})`, commit 49f1036; bare `universal-plugin` stays help ("pure dispatcher with no single live view"). `governance` bare ran `list` (retired 2026-09-28).
- #10: each command has `.addHelpText('after', '\nExample:\n  $ universal-plugin plugin build --vendor claude-code\n')` (synopsis, flags, one example).
- #7 ambient context: deferred in spec (charter boundary), ADR-0005/0006 later address "skill half" via installable skills, not a hook command. (cyber-asana and cyberlegion have hook installers; UP does not.)
- Flags: `--format <toon|json>`, hidden `--json` (deprecated alias), `--root <path>`, `--dry-run`, `--verbose`, `--strict`, `--full`, `--vendor`, `--clean`, `--strict-dependencies`.
- gh: PRs mentioning axi: #111, #64, #77, #16, #28 (all feature PRs, none axi-specific); no AXI issues.

======================================================================================================
## 4. cynapse (cyberuni/cynapse) - newest error model

Files: packages/cynapse/src/output.ts (37), cli-error.ts (76), cli.ts (26), program.ts, tests cli-error.test.ts, output.test.ts, program.test.ts. Docs: apps/web/src/content/docs/concepts/agent-friendly-output.md (full text above in repo), cli/index.md (#errors table). AGENTS.md:166-177 ("Agent-friendly output" - same boilerplate as truss/asana). .changeset/json-errors.md.
Commits: fa5c956 (2026-10-04 "render errors as JSON with a stable code under --json", PR #40 closes #33: first on STDERR), 05437cc (2026-10-04 21:38 "fix: print errors on stdout behind an error: label, per axi: The Council ruled that the axi agent-CLI principles decide how errors render. axi §6 puts errors on stdout in the same structured format as normal output, and keeps stderr for diagnostics agents don't read"; "Commander's own `error:` label is stripped so it isn't doubled"; load-test harness reports failed worker from stdout too). Open issue #41 (2026-10-05): "Errors don't tell an agent what to do next, and bare-group usage still goes to stderr" - lists three remaining AXI gaps: (1) every error should carry a next step (`help:` line) in text and JSON; (2) unknown flag should list valid flags; (3) bare-group usage should reach stdout (or be inlined in the error), because "an agent sees the pointer but not the usage it points to". cyber-asana already solved (2) (cli-usage.ts).

### 4.1 Helpers
```ts
export type OutputFormat = 'text' | 'json'
export function setOutputFormat(next: OutputFormat): void; getOutputFormat(): OutputFormat    // module-level state set in preAction hook (and in exitOverride, because usage errors fire BEFORE preAction)
export function output(data: unknown, readable: () => string): void     // console.log(json ? JSON.stringify(data,null,2) : readable()); readable is a thunk returning a STRING
export function printEmpty(entity: string, extra: Record<string,string> = {}): void
   // text: `0 ${entity} found` + `\nkey: value` lines for extras (e.g. a change token); json: {count:0, entity, items:[], ...extra}
// cli-error.ts
export const EXIT_OK=0, EXIT_FAILURE=1, EXIT_USAGE=2, EXIT_TIMEOUT=3, EXIT_AMBIGUOUS_ADDRESS=4, EXIT_UNKNOWN_ADDRESS=5
export class CynapseError extends Error { exitCode: number; code?: string; details?: Record<string,unknown>
   constructor(message, {exitCode?, cause?, code?, details?}) }
export function errorCodeFor(e): string        // coded error -> its code; else exit===USAGE ? 'usage' : 'failure'
export function exitCodeFor(e): number          // CynapseError.exitCode else 1 (unknown throws are failures, never usage)
export function renderCliError(e, format = 'text'): string
   // json: JSON.stringify({error:{code, message, ...details}}, null, 2); text: `error: ${message}`; message appends cause: `msg: cause.message` when cause adds info
```
- cli.ts top level: `console.log(renderCliError(error, getOutputFormat())); return exitCodeFor(error)` -> `process.exitCode = await run(argv)` (STDOUT). CLEAN_EXITS = {commander.version, commander.help, commander.helpDisplayed} => 0.
- Commander wiring (program.ts:36-60): `exitOverride` converts any commander error to `CynapseError(message w/o "error: ", {exitCode: 2, code:'usage'})`; `configureOutput({outputError: () => {}})` silences Commander's own error line; help still goes to stderr. A command group run with no subcommand => commander exits non-zero with code `commander.help`; converted to `CynapseError('missing subcommand; see the usage above', usage)` (bug/gap = issue #41.3).

### 4.2 Literal examples
Text: `error: no entry found for "nope#9"`; JSON: `{"error":{"code":"not_found","message":"no entry found for \"nope#9\""}}` (pretty printed). Empty: `0 unread channels found` / `{count:0, entity:"unread channels", items:[]}`. JSON of read commands is the library's shapes, e.g. `unread --json` => `{count, items:[{channelId,handle,count}]}`.
Stable error codes (docs cli/index.md#errors): `usage`(2) `not_found`(1) `id_conflict`(1) `not_owner`(1) `not_address`(1) `schema_too_new`(1) `port_in_use`(1) `gui_not_installed`(1) `invalid_token`(1) `foreign_token`(1) `timeout`(3 - "unlike 1, waiting again may succeed") `ambiguous_address`(4, `error.candidates` lists each candidate's id/kind/name/registeredBy) `unknown_address`(5). Doc rule: "The `code` is the contract; the `message` is for people and may change." "The set [of exit codes] stays small on purpose. A new code needs a reason a caller would act differently."

### 4.3 Other conventions in the doc
- "Cheap reads": `--unread`, `--meta-only`, `--from-summary`, `--view`, `--after`, `--limit`, `channel show` as a one-call briefing - minimal-data flags per command rather than a global `--fields`.
- Idempotent writes: `entry append --id <uuid>`, `channel create --key|--anchor` safe to retry; same input returns existing, different input fails `id_conflict` (commit 335c639 "refuse an idempotent retry whose payload differs").
- No TOON, no counts line, no next-steps (yet). Text mode is "compact human-readable line".
- `--json` boolean global; env `CYNAPSE_PARTICIPANT` (actor), `CYNAPSE_HOME`; `--as`, `--db`.
- Docs say the CLI is "shaped for agents" but format default is human text (like cyber-asana): the agent must remember `--json`.

======================================================================================================
## 5. cyber-truss (cyberuni/cyber-truss)

Pre-feature repo: "truss currently ships no domain commands" (docs/backlog.md:286). src/output.ts is byte-identical to cynapse's pre-error-change version; src/cli-error.ts is the OLDER cynapse shape: `TrussError(message,{exitCode,cause})`, `renderCliError(error): string` (message + cause), top-level `console.error(renderCliError(error))` (STDERR, text only, no JSON error). Exit codes documented: 0 success incl --help/--version, 1 command failed, 2 usage. AGENTS.md:127-134 and cli/index.md:7 carry the same AXI boilerplate (`output(data, readable)`, `printEmpty(entity)`, `0 members found`).
Design intent recorded in docs/backlog.md (the only place TOON is discussed):
- Open decision 4 (backlog.md:66): "Does adopting axi/TOON supersede ADR 0001? TOON on stdout is agreed; the ADR's 'structured --json' consequence has not been formally superseded." Blocks C2/C3. (NB AGENTS.md says docs/adr/ exists; issue #12 says it doesn't.)
- C2 (backlog.md:298): "adopt axi/TOON - supersedes part of ADR 0001. ADR 0001 commits to structured `--json`; axi puts TOON on stdout and keeps JSON internal, so there is NO FLAG to negotiate and the machine interface IS the default output. Needs an amending or superseding ADR, not a quiet change."
- C3 (:303): "Rewrite src/output.ts. TOON becomes the readable rendering, so the `readable` thunk loses its reason to exist and `output(data)` serializes once." -> design direction: a single `output(data)` that always serializes TOON; no `--json`/`--toon` negotiation. (Contrasts with legion's `--format json` escape hatch.)
- C8 (:321): "Session hook registration. axi §7: inject compact state at session start, default targets Claude Code / Codex / OpenCode. Includes executable path repair after a reinstall - which is `doctor --fix` work." And C4 `truss doctor` (read-only; `--fix` repairs; needs a git-tracked `declined` state so reports don't nag), C5 `truss check`.
Git log "axi|toon" hits are noise (deps). gh: only issue #12 (unrelated).

======================================================================================================
## 6. cyberfleet (cyberuni/cyberfleet)

AGENTS.md:139-144: "The CLI follows the 10 agent-CLI principles. Structured output (`toon` default, `--format json` escape hatch) flows through the primitives `cyberfleet` imports from `cyberlegion` (`emit`, `toonObject`, `toonList`) rather than re-implementing formatting locally." readme.md:46-47 flag table: `--format <format>` toon (default) | json. No local output.ts; src/cli.ts imports from `cyberlegion` lib façade (cyberlegion src/index.ts:40-42). Same flag trio: `--root <path>` (alias `--space <path>`; cyberlegion hub root), `--format toon|json` via `rootOpts(cmd)` (cli.ts:60-63). Commands: `missions` (`missions[N]{handle,branch,status,mission,spec,gate:spec,gate:impl,leash,council,hal}:` + `N ships`; cell values like `approved 3/5`, `approve(agent)`; `-` for missing, `yes` for council, `!` for hal), `jump` (`jumped: <handle>\npane: <id>`), `pause` (`paused: <handle>\nstatus: paused`). Errors: plain `process.stderr.write(msg+'\n'); process.exit(1)` (NOT cyberlegion's JSON `fail()`; not imported) and an unimplemented command (`gate approve`) writes a long explanation to stderr with `process.exitCode = 1` (a "refuse loudly, say what it would have written, point at the in-session skill" pattern). No nextStep hints. History: 938d6c1/e1dc0c4 (2026-07-05, CR-6b: repointed onto cyberlegion; deleted duplicate mechanism), 9181655 (merge of cyberplace marketplace charter+AXI adoption spec). Lesson: sibling CLIs reuse cyberlegion's helper via re-export so stdout/stderr contract stays shared - but cyberfleet did not adopt `fail`/`nextStep`, so its error shape diverges (message vs `{"error":...}`), exactly the drift a shared @clibuilder/axi should remove. Note `dist/cli.mjs` in repo bundles a copy of the helpers (cli.mjs:5717+).

======================================================================================================
## 7. Recommended synthesis for @clibuilder/axi (my read, with provenance)

1. TOON default + `--format json` escape (legion, UP, fleet) is the majority AXI-faithful shape; add hidden `--json` alias (UP) and keep `--toon` out. Optionally accept `--format text` for humans (legion explicitly refuses; asana/cynapse default to text) - decide.
2. Use the official `@toon-format/toon` encoder (UP) or asana's tested toon.ts, not legion's `toonObject` (no escaping).
3. Aggregates: put them in-band as a `summary` field (UP) or an `N things` last line (legion); keep out of JSON.  Preserve `name[0]{cols}:` header on empty (legion) PLUS an explicit `0 <entity> found`/`0 <things>` count - all repos agree "never blank".
4. Hints: `→ <command>` lines; stream is the open question. cynapse's rationale (agents read stdout; AXI §6) vs legion/UP's rationale (stdout stays machine-clean for `| jq`). Both want errors structured. Consider: errors on stdout in the selected format (cynapse/asana-spec) and hints on stderr (legion/UP), or a `hint`/`help` field INSIDE the error object (cynapse #41, asana `error.hint`).
5. Error model: asana's `{ok:false,error:{kind,code,message,status?,hint?,...}}` + cynapse's `code` taxonomy + `details` merge; exit codes 0/1/2(usage)/3(auth-config or timeout - NOTE the two repos assign 3 differently)/4/5/6. A shared package must choose: asana 3=config/auth,4=403,5=404,6=429,7=402; cynapse 3=timeout,4=ambiguous,5=unknown address. Recommend a small shared base (0,1,2) + consumer-extensible map.
6. Usage errors: asana's `installUsageErrors` + `buildUsageErrorBody` (valid_flags, hint) is the most complete; cynapse issue #41 wants exactly this.
7. Truncation helper: `truncate(value,{limit,full})` with hint `… [truncated, N chars total; use --full for the rest]` (asana) / `… +N more — rerun with --full` (UP rows) / `… (N chars total, pass --full)` (legion). Decide ONE string; decide whether JSON is truncated (legion yes, asana/UP no - prefer no).
8. Content-first bare command + `setup hook` / `init` for SessionStart ambient context (asana `setup hook`, legion `init` + `mail hook`; UP `plugin` group bare = validate).
9. Detect agent vs TTY: nobody does; UP's ADR-0005 explicitly rejects TTY branching. Keep it flag-driven.
10. Test strategy worth copying: e2e on the built binary asserting stdout/stderr/exit separately (legion); unit tests per helper that structured modes are silent for prose (asana); parametrize "empty state" and "exit 0" clauses (legion lesson: in-process bindings cannot observe exit codes).
