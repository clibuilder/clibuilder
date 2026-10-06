# AXI catalogue: cyberplace, cyber-sdd, agent-harness

Paths: CP=~/code/cyberuni/cyberplace, SDD=~/code/cyberuni/cyber-sdd, AH=~/code/cyberuni/agent-harness.
"AXI" = https://github.com/kunchenguid/axi (10 principles: 1 TOON default, 2 minimal 3-4 field schema, 3 truncation+--full,
4 pre-computed aggregates, 5 definitive empty state, 6 structured errors/exit codes/no prompts/fail-loud, 7 ambient context,
8 content-first, 9 next-step, 10 per-subcommand help). All three repos treat TOON as the agent default.

IMPORTANT FINDING: the cyberplace *impl* of AXI is thin. Only `tavern` is built (one encoder). The rich contract is in the SPEC
(CP/.agents/specs/cyberplace/axi/README.md) and in the extracted universal-plugin (git history). formatOption /
defineFormatOption / createOutput / encodeResult / renderText(tables,bullets,"(none)") are NOT in cyberplace: those names
come from agent-harness (parseFormat/writeResult/writeDocument/encodeResult/renderText/collapseHome). See section 4.

=====================================================================
## 1. cyberplace (CP)  -- repo cyberuni/cyberplace
=====================================================================

### 1.1 Sources
- Contract spec: CP/.agents/specs/cyberplace/axi/README.md (reference node; "same contract universal-plugin adopted, ADR-0003")
- ADR decision: CP/.agents/specs/cyberplace/design/decisions/README.md:25-47 (adopt AXI #1-6,#8-10; defer #7; spec-only, impl trails)
- Consumer suites (frozen .feature): marketplace/tavern/tavern.feature:90-160, marketplace/registry/registry.feature:186-345,
  marketplace/awesome-list/awesome-list.feature:154-270 (all under CP/.agents/specs/cyberplace/)
- Impl: CP/packages/cyberplace/src/output.ts (71 lines), src/tavern/cli.ts (70 lines), src/tavern/tavern.test.ts:128-235
- Older (pre-AXI) ADR: CP/artifacts/adr/0004-cyberplace-cli-output.md (3 archetypes; `--format agent`)
- Older governance: CP/packages/cyberplace/governances/agent-tool-output.md (stdout machine contract rules; `--format agent`)
- Extracted universal-plugin impl (deleted, in git history): `git show c5894683:packages/universal-plugin/src/{output.ts,build/cli.ts,bundle/cli.ts}`,
  ADR `...spec/design/decisions/0003-adopt-axi.md`, `...spec/axi/README.md`, `governance/governance.feature`.
- PRs/issues (gh, cyberuni/cyberplace): PR #74 "marketplace charter + AXI adoption (spec + suite)"; PR #180 "tavern AXI CLI surface +
  malformed-manifest guard (Closes #76)" (commit 39ec1cf5); PR #187 "plugin build AXI output surface (#89)" (commits 79620344, c5894683);
  PR #85 "split build/bundle" (bundle was the first AXI form, cited as the model); issue #76 (tavern follow-ups), issue #89
  (build AXI surface). Doctrine-loop ledgers: CP/.agents/specs/cyberplace/ledger/strategy.f5152c.jsonl,
  .../github-76-tavern-followups.9a727b.jsonl (record "first real TOON encoder").

### 1.2 Output shape (TOON)
Helper (output.ts:26-48), the ONLY TOON encoder in the repo:
```ts
function toonScalar(value: string): string   // quote if value==='' || /[",:\n]/.test(v) || v !== v.trim(); escapes " as \"
export function renderToonTable<T>(
  key: string, items: T[],
  cols: { label: string; get: (item: T) => string }[],
): string
// header `${key}[${items.length}]{${labels.join(',')}}:` then rows `  a,b,c` (2-space indent, comma-joined)
```
Literal tavern output (tavern/cli.ts:48-66; test tavern.test.ts:129-143 asserts `crews[2]{name,description,recruit}:` and `2 crews`):
```
summary: 2 crews
crews[2]{name,description,recruit}:
  navigator,Navigator crew,cyberplace add navigator
  gunner,Gunner crew,cyberplace add gunner
```
- Aggregate printed as a `summary: <text>` scalar line BEFORE the table on stdout (tavern/cli.ts:49-50). Singular/plural: `1 crew`, `2 crews`.
- Row schema is 3 columns (name,description,recruit) although the JSON payload carries 5 fields (name,description,source,tags,recruit)
  (cli.ts:30-36 vs 56-60) -> minimal-schema (#2) applies to TOON only; JSON is the full record.
- Spec-frozen minimal schemas (#2): find -> `repo, summary, install`; list -> `name, scope, source`; providers -> `name, type, match`;
  sources -> `name, layer, enabled`; build (universal-plugin) -> `vendor, path, status`; governance list -> `name, scope`.
- Spec says "TOON (or --format json) payload INCLUDING its aggregate summary" on stdout (axi/README.md:75-76).
- Quoting divergence to note: cyberplace quotes on `, " : \n` and escapes `\"`; cyber-sdd quotes on `, "` (and `;`) and doubles `""`
  (CSV style, not TOON-spec); agent-harness delegates to `@toon-format/toon` encode(). Real TOON uses backslash escapes -> use the library.

### 1.3 Flags / format selection
- `--format <format>` "Output format: json or toon (default: toon)" (tavern/cli.ts:25). `--json` kept as HIDDEN alias:
  `.addOption(new Option('--json').hideHelp())` (cli.ts:26); resolved `opts.format ?? (opts.json ? 'json' : 'toon')` (cli.ts:38).
  NO validation of the format string: anything not 'json' falls to TOON (contrast agent-harness parseFormat which throws).
- `--full` "Print the whole roster without truncation" (cli.ts:24). `--root` via shared ROOT_OPTION/resolveRoot (src/cli-options.ts).
- Free-text positional filter `[query...]` (cli.ts:22). `--dry-run`, `--verbose`, `--clean`, `--vendor` exist on universal-plugin build.
- Legacy (non-tavern) cyberplace commands still use: `--format agent|json|text (default: text)` (awesome/cli.ts:18,49,69,82,106),
  `output(data, readable)` helper (output.ts:68-71), `printTable` (uppercased padded columns, `(none)` for empty; output.ts:13-24),
  `printFields` (key  value padded; output.ts:5-11), `getFormat()` scanning process.argv for `--format`/`--json` (output.ts:50-56),
  `isAutomatedOutput()` true for json|agent (output.ts:63-66) used to suppress prompts (registry/cli.ts:65,170,254),
  `isInteractive()` = `process.stdin.isTTY === true && process.stdout.isTTY === true` (registry/prompt.ts:13-15).
  ADR-0004: `--format agent` = terse text; `--format json` for non-LLM scripts. Spec axi/README.md:41-43 says agent|json|text "collapses
  toward TOON default + json escape".
- Universal-plugin governance/build also accepted `--format toon` explicitly ("names the default"): feature scenario "--format toon names the default explicitly" (issue #89).

### 1.4 Truncation (#3)
- Constant `TRUNCATE_THRESHOLD = 20` rows (tavern/cli.ts:8; bundle/cli.ts:10 in history).
- Hint, printed on STDOUT after the table: `… +${n - 20} lines — rerun with --full` (tavern/cli.ts:62-64). Spec regex:
  `… +\d+ lines — rerun with --full`. NOTE: the number is hidden ROWS though it says "lines". universal-plugin bundle printed
  `… +N more — rerun with --full` (inconsistent; bundle/cli.ts history).
- `--full` disables; `--format json` is NEVER truncated (valid JSON array of all items) (tavern.test.ts:145-171; feature "tavern --format json is never truncated").
- Truncation also applies to long text bodies (governance show: 400-line doc -> size hint; small doc never shows "rerun with --full";
  `--format json` returns all lines in `content`) and to `awesome inspect` (60 skills) per specs.
- Row count in header (`crews[N]`) is the TOTAL or the shown count? In impl, `renderToonTable('crews', rows, ...)` is called with the
  TRUNCATED `rows`, so header says `crews[20]` while the summary line says `40 crews` (cli.ts:54-56). Potential lesson: header N reflects shown rows.

### 1.5 Counts / aggregates (#4) -- literal strings (spec)
- tavern: `2 crews`; find (awesome): `3 skills across 2 sources`; sources list: `2 sources across 2 layers`; render: `rendered 3 entries`.
- registry: add `installed 2 skills, skipped 1`; list `2 skills across 1 scope`; find `1 result across 1 marketplace`;
  config provider list `1 provider across 1 scope`; migrate `migrated 2 entries`.
- universal-plugin: build `built N, skipped M, failed K` (after table, build/cli.ts); bundle `pinned N, unchanged M, skipped K`;
  governance list `2 governances across 2 scopes`.
- Plural handling: "1 result across 1 marketplace" / "1 provider across 1 scope" -> singular when count is 1 (spec).

### 1.6 Empty states (#5) -- exit 0, never blank
- tavern: `summary: 0 crews found` (cli.ts:49) + empty header `crews[0]{name,description,recruit}:` (renderToonTable always emits header).
- Spec strings: `0 results found` (registry find), `0 skills found` (awesome find), `0 skills installed` (list), `no providers configured`,
  `no sources configured`, `0 governances found`; migrate with no lock file: exit 0 "source file was not found" (today's code exits 1; impl deferred).
- build empty: prints `built 0` and keeps `nothing to build`; bundle empty: stderr `nothing to bundle` (idempotency/no-op note on stderr).
- Legacy printTable empty => `(none)`.

### 1.7 Next-step hints (#9) -- STDERR, last line
Exact syntax: `→ <cli> <cmd> [<arg>]\n` written with `process.stderr.write` (tavern/cli.ts:10: `const NEXT_STEP = '→ cyberplace add <name>\n'`).
Written for BOTH toon and json (cli.ts:44, 66). Scenario checks "stderr ends with" (tavern) or "contains" (awesome).
Catalogue (spec): find -> `→ cyberplace add <spec>`; add -> `→ cyberplace list`; awesome find -> `→ cyberplace awesome inspect <repo>`;
awesome inspect -> `→ cyberplace awesome find`; awesome render / sources list -> `→ cyberplace awesome sources list` / `→ cyberplace awesome find`;
tavern -> `→ cyberplace add <name>`; universal-plugin build -> `→ universal-plugin plugin validate`; bundle -> `→ review and commit the pinned skills`
(note: plain-text advice, no command, after `→`); governance show -> `→ universal-plugin governance list`; list -> `→ universal-plugin governance show <name>`.
Placeholders are literal `<name>`/`<spec>`/`<repo>`, not substituted with actual values from the result.

### 1.8 Error shape (#6), streams, exit codes
- Stream discipline (axi/README.md:73-80): stdout = machine result only (payload + aggregate). stderr = next-step, warnings, errors.
  So `--format json | jq` stays valid.
- Spec says errors are "structured (a stable `code` + message, honoring --format)". IMPL does NOT do this: errors are plain text on stderr:
  `process.stderr.write(\`${err.message}\n\`); process.exit(1)` (universal-plugin cli try/catch). Tavern malformed manifest: stderr
  `Could not parse marketplace manifest at <path>: …`, exit 1, stdout does NOT print `0 crews found` (tavern.test.ts:~225-235).
  -> GAP between contract and impl: no `code` field exists anywhere.
- Warnings: `warn: ${warning}\n` on stderr (build/bundle cli).
- Exit codes: `0` success, `1` failure. Partial failure: `process.exitCode = 1` if `failed > 0` but still print result (build/cli.ts).
  Unknown flag: exit 1, stderr names the flag (commander default; scenario "an unknown flag fails loud": stderr contains `--frobnicate`).
  Invalid enum flag: exit 1, stderr `Expected --layer local|repo|global`.
- No interactive prompts: `add`/`remove`/`update` run to a deterministic default instead of a TTY select; `remove` with no name
  -> exit 1 no prompt; `init --yes` becomes a compat no-op. (impl deferred for registry; prompt.ts still gates on isInteractive().)
- Idempotency: re-running `add acme/skills:alpha` exits 0, lock still has exactly one entry. Mutations idempotent (#6).

### 1.9 Content-first (#8) and help (#10)
- Command group with no subcommand shows live data, not help: `cyberplace awesome` == `awesome sources list`; `cyberplace config` == `config provider list`;
  `cyberplace tavern` shows roster; `governance` == `governance list`; `plugin` group == `plugin validate`. Bare top-level `cyberplace` is a dispatcher -> help.
  Scenario: "stdout is the same TOON result as `<explicit subcommand>`".
- `--help`: synopsis, flags, one example. Implemented via `.addHelpText('after', '\nExample:\n  $ cyberplace tavern navigator\n')` (tavern/cli.ts:27). Test: stdout matches /Usage:/, contains `--format`, `Example:` (tavern.test.ts:215-220).

### 1.10 Documents vs results
- ADR-0004 3 archetypes: dual-audience `output(data, readable)`; always-JSON (hook runtime: single JSON value via process.stdout.write, no console.log);
  markdown-on-stdout (`governance show <name>` default = raw markdown body; `--format json` = wrapper). The AXI spec keeps this: governance show
  is a document (truncated with `--full` hint) vs list = result.
- agent-tool-output governance: "one JSON value per run or silence", `process.stdout.write` not console.log, no ANSI/progress on stdout,
  `--verbose` gates human diagnostics on stderr, files hold durable state (stdout names paths), tool never formats user prose.

### 1.11 TTY vs agent detection / env vars
- NO env-var-based agent detection in cyberplace output (no AI_AGENT/CLAUDECODE). Detection is explicit by flag: `isAutomatedOutput()`
  (format json|agent) and TTY check in prompts. TOON default is unconditional (not TTY dependent). Stdout is not colorized.

### 1.12 Notable process lessons
- Bug caught by github-76: universal-plugin `bundle/build` claimed "TOON default" but used `printTable` (aligned columns, not TOON). Nobody noticed until
  frozen scenarios were run against the real bin ("a printTable call claiming to be TOON-default", sdd ledger strategy.2d9bbc seq 8).
  Lesson: test the header `key[N]{cols}:` literally.
- Bug caught by github-89 judge (commit c5894683): `--format json` payload first-cut lacked the frozen `built` array; shaped a purpose-built
  JSON `{built:[...],skipped:[...],failed:[...],summary:{built,skipped,failed},warnings:[]}` grouping rows by status. Lesson: json shape is a
  separate contract from TOON rows; judges re-derive from spec.
- Spec-first, impl-trails pattern: banners "Impl trails the AXI contract" on each node until built; lifted when impl lands.
- AXI #7 (ambient context: session hook + installable skill) DEFERRED because cyberplace add IS the skill installer (axi/README.md:28-34).
- Plan: CP/.agents/plans/axi-conformance.plan.md; cyberplace-registry-node-split.plan.md:39-46 lists cross-cutting clusters: output format (~9 scenarios),
  aggregates (~6), definitive-empty-state (~4), CLI ergonomics (~13: non-interactive, idempotent re-run, unknown-flag, next-step, --help).
- agent output `--json` hidden compat alias retained across migration (CHANGELOG 0.x "Add `--format agent`", packages/cyberplace/CHANGELOG.md:142).

=====================================================================
## 2. cyber-sdd (SDD) -- repo cyberuni/cyber-sdd
=====================================================================
No "AXI" word in code; TOON is the convention for "engines" (node .mts scripts under plugins/sdd/skills/*/scripts). No gh PRs/issues on axi/toon
(only dependabot PR #49). Origin of the TOON convention: ADR-0017 (docs/adr/0017-frontmatter-is-the-router-index.md:159 "frontmatter-only, TOON output,
consumed by the gateway's status scan"). Comment string in each engine: "TOON -- the token-efficient tabular form the repo's other sdd engines emit".
Commits to read: b09c2bf (blast-estimate engine #192), ebbfcf8 (bind collision-ladder --format path #189), 5b433721/3cdc149 (doctrine scanner).
Ledger lesson: SDD/.agents/specs/sdd/ledger/github-189-collision-ladder.1cf516.jsonl seq 3: mutation test caught that a test exercised the render helper but
never drove `main()`'s `--format` flag; a mutation hard-coding the format passed all tests -> test the flag path end-to-end (collision-ladder.test.mts:376-400).

### 2.1 Engines & shapes (each hand-rolls its own TOON; no shared helper -> code duplication of toonField/toonQuote 8 times)
Header form `name[N]{col,...}:` + 2-space-indented rows; scalar sections `key: value`; list sections `key[N]: a;b;c` (semicolon-joined inline lists).
- discover-plans: scripts/discover-plans.mts:187-199. `const COLUMNS = ['cr','name','total','completed','inProgress','status','next'] as const`;
  `export function toToon(plans): string`. Example (SKILL.md:58-62): 
  ```
  plans[2]{cr,name,total,completed,inProgress,status,next}:
    github-34,github-34: ...,34,21,0,active,"sub-corpus — suites done, impls pending"
  ```
  Flags: `--root .` `--format toon|json` `--status <value>` (opt-in filter). json = flat array. Always exit 0. Empty -> `plans[0]{...}:` header only (no prose).
- discover-specs: scripts/discover-specs.mts:391-416. columns `path,name,nameSource,status,projectPath,approvals`; flags `--root`, `--format`, `--resolve <name>` (match -> 1 row; ambiguous -> candidate rows; none -> empty).
  Output "carries no spec body content" (frontmatter only) is a spec scenario (discovery.feature:78-95).
- check-plan-safety: toToon(leaks) `leaks[N]{file,line,kind,token}:` (test: `toon.startsWith('leaks[1]{file,line,kind,token}:')`); `--check` is the CI mode:
  exit 1 iff any leak; audit mode always exit 0. Repeatable `--path <file>`.
- check-spec-structure / check-scenario-overlap / align-spec: `--spec-dir`, `--check`, `--format toon|json`; audit prints findings then
  `advisory[N]:` list + `note: advisory — findings feed the Warden formation pass; the engine writes nothing`. check mode: stderr
  `check-spec-structure: N blocking finding(s)` + exit 1, or stdout `check-spec-structure: no blocking findings` + exit 0 (check-spec-structure.mts:320-345).
  json = `JSON.stringify(findings)` (single line, not pretty) here but pretty-printed (`null, 2`) elsewhere -> inconsistent.
- blast-estimate: scripts/blast-estimate.mts:480-535. Scalar/aggregate form:
  ```
  blast-estimate: computed=<lvl> lineup=<outcome>(declared=<lvl>)
  reasons: count=N maxFanIn=N sensitiveAreas=[a;b] projectWide=[...]
  resolved[N]: a;b
  unresolved[N]: ...
  ```
  Error as a TOON line: `blast-estimate: error="<msg>"` + `unresolved[N]: ...`, exit 1 (`return result.error ? 1 : 0`).
  Flags: `--root --touch-set a,b,c --layout 'proj:root1,root2'(repeatable) --declared low|medium|high|unknown --format`.
  Fail-loud on bad enum: stderr `blast-estimate: --declared must be one of low, medium, high, unknown (got "X")`, exit 1; rationale in comment
  (typo scored -1 and fabricated an "under-called" finding -> validate, don't cast; case-sensitive on purpose). `parseDeclared(raw): DeclaredBlast | null`.
- collision-ladder: renderVerdictToon -> scalars `node: x` `collision: soft` `rung: region` `confidence: ..`, table `sharedFiles[N]{path,collision,rung,reason,sharedThin}:`,
  `smells[N]: a;b`, `deferrals[N]: ..`. Flags `--input <file|->`, `--from-git`, `--shared-thin-threshold 3`, `--format`. Test asserts default output ===
  `${renderVerdictToon(expected)}\n` and json parses to the same verdict (collision-ladder.test.mts:376-400).
- touch-set-correction: scalar lists `corrected[N]: a;b`, `confirmed[N]`, `missed[N]`, `overDeclared[N]`, table `nodes[N]{node,files,changedScenarios}:` (files cell `path(artifactType);...`), `unmapped[N]`. `--base <ref>` REQUIRED:
  stderr `touch-set-correction: --base <ref> is required`, exit 1.
- mission-graph: subcommands `ready|cycles|operation --id|append|migrate|sync`; TOON `ready[N]{id,node,operation,blast,hitlOrAfk,modelTier,briefPointer,whyReady}:`,
  `cycles[N]{scc,members}:` (`scc-1`, members `a;b` quoted), sync result as `key: value` lines (`backend: .. action: .. ok: true message: ..`); exit 1 on missing arg
  (stderr `mission-graph operation: --id <operation-id> is required`) and on unknown subcommand (stderr `mission-graph: usage: ready | cycles | ...`).
- verify-scenarios: DEFAULT is `text`, `--format toon|json` on request (verify-scenarios.mts:~430). TOON has multiple tables + summary-as-table:
  `scenarios[N]{name,key,state,resultCount}:` `extras[N]{key}:` `mismatches[N]{key,matchedKey}:` `summary{node,total,bound,pass,fail,unbound}:` + one row. Text form:
  `PASS     <name>` lines then `N/M BOUND, P pass, F fail, U unbound`. Exit code: 1 iff any UNBOUND or FAIL (`exitCode(report)`). Missing required `--feature`/`--node`:
  prints usage on STDOUT (`w(...)`) and exit 1 (differs from stderr convention elsewhere). `--run` executes configured commands; else reads existing report.

### 2.2 SDD-specific conventions
- Default `--format` is TOON everywhere except verify-scenarios (text). json "for non-LLM consumers" (discover-plans SKILL.md).
- Audit vs check split: default mode = report, exit 0 always; `--check` = CI guard, exit non-zero on findings, writes nothing ("read-only" is a stated boundary in SKILL.md files).
- No next-step hints, no truncation, no `--full`, no counts/summary lines (count only in the `[N]` header), no stderr hints. Empty states are just empty-table headers (`plans[0]{...}:`).
- Arg parsing is hand-rolled `argv.indexOf('--x')` (flag()/allFlags()/splitCsv()) with NO unknown-flag rejection and `--format` anything-but-json -> TOON (silent fallback; check-spec-structure casts `argv[++i] as 'toon'|'json'` unchecked).
- Scripts return exit code from `main(argv): number`, run via `process.exit(main(process.argv.slice(2)))` guarded by `import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href`.
  Output is always `process.stdout.write(\`${out}\n\`)`.
- Agent fallback documented: "When `node` is absent, an agent performs the same derivation by hand" (discover-plans SKILL.md:66).
- aced plugin governance copy: SDD/plugins/aced/governances/agent-tool-output.md (older `--format agent` rules, same text as cyberplace governance); aced scripts (`source.mts`, `extract-situation.mts`) use `--format json|text`, `--json` alias (extract-situation.mts:244).
- Quote rule differences listed in 1.2. `[;]` inside list items is quoted, but cells containing `:` or `\n` are NOT quoted -> would break strict TOON.

=====================================================================
## 3. agent-harness (AH) -- repo cyberuni/agent-harness
=====================================================================
This repo holds the cleanest, library-backed implementation and is the origin of writeResult/writeDocument/parseFormat/renderText/collapseHome.
Source: AH/packages/agent-harness/src/command-output/command-output.ts (70 lines) + command-output.test.ts (110 lines); consumer
src/references/reference.command.ts; host src/cli.ts. Introduced in commit 849cff0 "feat: resolve layered reference documents" (PR #49, merged;
Version Packages #50). gh search for axi: none (only `toon` -> PRs #49,#50). Dependency `@toon-format/toon@^4.1.1` (AGENTS.md: "no agent-layer dependencies; yaml, clibuilder, @toon-format/toon are ordinary npm libraries").
Exported subpath `./command-output` (src/command-output.ts re-export) and `./commands`/`./reference-command` for hosting in another clibuilder CLI.

### 3.1 Helpers (exact signatures, command-output.ts)
```ts
export type OutputFormat = 'json' | 'toon' | 'text'
export const formats: readonly OutputFormat[] = ['toon', 'json', 'text']
export function parseFormat(value: string | undefined): OutputFormat
   // throws Error('--format must be toon, json, or text.') for anything else INCLUDING undefined -> never falls back silently
export function writeResult(value: object, format: OutputFormat): void
   // process.stdout.write(`${encodeResult(value, format)}\n`)  -- "the single stdout boundary: internal logic stays on plain objects, encoding happens here"
export function writeDocument(content: string): void
   // verbatim write, appends '\n' only if missing; bypasses encoders ("a Markdown body run through TOON or text comes back as one escaped line"); "a command writes one or the other, never both"
function encodeResult(value: object, format): string  // json -> JSON.stringify(value) (compact, one line); text -> renderText; toon -> encode() from @toon-format/toon   (NOT exported)
export function renderText(value: object): string
export function collapseHome(home: string, path: string): string  // "AXI §10": home dir -> `~` so a path is portable; no-op if home==='' or path outside home
```
renderText rules (command-output.ts:46-62): per top-level key: non-array -> `key: value` (objects as JSON.stringify, scalars String()); empty array -> `key: (none)`;
array of records -> `key:` + aligned table (2-space indent, columns = union of keys in first-seen order, 2-space gutter, missing cell blank, trailing space trimmed,
NO header underline, NO uppercase); array of primitives -> `  - item` bullets. Blocks separated by a blank line if either neighbour is multi-line; consecutive scalars stay together
(test "separates a multi-line block from its neighbours but keeps scalars together"). Literal examples (tests):
```
bridges:
  harness      path            status
  claude-code  .claude/skills  ok
  gemini-cli   .gemini/skills  degraded
```
```
linked:
  - claude-code
  - gemini-cli

deprecated: (none)
```
TOON example (test): `writeResult({skills:1},'toon')` -> `skills: 1\n`; json -> `{"skills":1}\n`; text -> `skills: 1\n`. Test asserts exactly one stdout write per call.

### 3.2 Format option per command (reference.command.ts)
- Option declared with clibuilder `command({options:{format:{description,type:z.optional(z.string()),default:'toon'}}})`. A shared `listFormatOption` const (reference.command.ts:231-235)
  `{ description: 'Output format: toon (default), json, or text for a human-readable report.', type: z.optional(z.string()), default: 'toon' }` is reused by list/search/where.
- DEFAULT DIFFERS BY COMMAND KIND: result commands (list, search, where) default `toon`; document commands (show, create, delete) default `text`
  ("text (default) writes the documents themselves; toon and json return an array with metadata" show:196-198; create:380-383; delete:494-497).
  -> "documents vs results": show/create/delete text path emits raw document via writeDocument; list/search/where always writeResult.
- `type CommonArgs = { root: string | undefined; format: string | undefined }`; shared `rootOption` ("Directory the project tier is read from… Defaults to the current directory").
- Other flags: `--trace` (report every path checked + why a layer was dropped), `--dry-run` (create/delete: print target + content/outcome, write nothing; 'would delete' vs 'deleted'),
  `--scope project|user` (validated: Error('--scope must be project or user.')), `--template`, `--caller`. No `--full`, no truncation, no `--fields`.
- Every command begins `const format = parseFormat(args.format)` inside try; invalid format -> stderr `error: --format must be toon, json, or text.\n`, exit 1 (tests 955-969).

### 3.3 Result shapes / counts / empty states
- Wrapper-object reports (not bare arrays) so TOON gets keyed tables: `ReferenceListReport = { layers: {tier,plugin,path,status}[]; references: ReferenceRow[] | string; warnings?: string[] }`.
- EMPTY STATE IS A STRING IN PLACE OF THE ARRAY (so a healthy zero is stated, "Emitted even when empty, so a healthy run states its zero explicitly", reference.command.ts:53):
  `references: '0 references — no layer holds one'` (list; test 1021) and `references: '0 references match "<query>"'` (search; test 1059; em dash U+2014 in list string).
  Type is `SearchMatch[] | string`. In TOON this renders `references: 0 references — no layer holds one`.
- `warnings` key is OMITTED when empty (`if (warnings.length) report.warnings = warnings`) except show entries which always carry `warnings: string[]`.
- No separate "N results" aggregate line; counts live in TOON array header `[N]` and in the zero string.
- show returns ARRAY of entries, one per name asked, in order asked: `{name,status:'found'|'missing'|'ambiguous',tier?,plugin?,path?,merge?,metadata?,content?,layers?,warnings,suggestions?,plugins?,trace?}`;
  missing -> `suggestions` (top 3 search matches) ; ambiguous -> `plugins` (list of holders).
- Paths always passed through `collapseHome(home, path)` (home dir -> `~`) in all report fields (including trace and layers).
- `delete` report: `{name,scope,path,dryRun,next:{status,tier?,plugin?,path?,plugins?},trace}` where `next` = "what answers the name once its copy is gone" -> this is the "no-op/idempotency/next-state" messaging; text: `<path>\n\n<would delete|deleted>. "<name>" is then answered by the <tier> copy <path>.` / `no copy of "<name>" is left in any tier.`

### 3.4 Document output (text path of show)
- 1 name -> raw document content via writeDocument (`'# Probe\n'` test). Several names -> each wrapped:
  `<reference name="X" tier="project">\n<content></reference>`, joined by blank line; unresolved -> `<reference name="X" status="missing" />` (or `status="ambiguous"`). 
- A single unresolved name writes NOTHING to stdout (test 1095-1099 "writes nothing to stdout for a single name that resolves to nothing"), exit 1.
- Skill-facing contract (skills/reference/references/load.md:21-25): exit 0 = every name resolved; 1 = at least one did not; "the command ran" heuristic = every name appears as a document, `status=` marker, or `error:` line.

### 3.5 Errors, stderr, exit codes
- stdout = machine result ONLY; stderr = `error: <message>\n` and `warning: <message>\n` lines (plain text, no code field) (cli.ts:41 comment: "stderr, not stdout -- stdout carries TOON an agent parses").
- Helper: `function fail(error, fallback): number { process.stderr.write(\`error: ${error instanceof Error ? error.message : fallback}\n\`); return exitCodes.error }`
  with per-command fallbacks: `error: Reference lookup failed.` / `Reference listing failed.` / `Reference search failed.` / `Reference placement lookup failed.` / `Reference creation failed.` / `Reference deletion failed.`
- Exit codes from clibuilder: `exitCodes.success`=0, `exitCodes.error`=1 (command failure; e.g. any missing name in show, ambiguous in where), `exitCodes.usage`=2 (parser threw / bad argv: `run()` catch writes `error: bad argv\n`, `error: Invalid command.` for non-Error) (cli.test.ts "reports a failure the parser throws on stderr, as a usage error" -> 2).
  `run(argv, host): Promise<number>` returns the code instead of calling process.exit "so a caller that is not the process can act on it"; non-number parse result => success.
- show with `--format text`: warnings and `trace <name>` blocks (renderText) go to stderr; with toon/json warnings/trace are inside the payload and only the `error:` lines go to stderr (writeShowStderr:168-176).
  Missing name message: `error: no reference named "<n>" in any tier. Did you mean: a, b, c?`; ambiguous: `error: "<n>" is held by more than one plugin; ask for one of dep-a/testing, ...` (qualified `<plugin>/<name>`).
- Input validation errors (exit 1, stderr): `Name at least one reference.`, `Search needs a query.`, `"../escape" is not a reference name`, `names a file` (name.md), `--scope must be project or user.`.
  A rejected name aborts the whole call before reading anything.
- Idempotency/no-clobber: `create` never overwrites: `flag: 'wx'`; error `<path> already holds "<n>"; change it with the reference skill's Update mode.`; refuses when a first-wins copy shadows (`nothing would read a new <scope> file`). Clean successful create has EMPTY stderr (test 1314 `expect(stderrLines()).toEqual([])`).
  `delete` of a non-existent copy => error (not silent no-op), explains what answers the name now and "Delete never removes a plugin-shipped or managed copy."

### 3.6 TTY vs agent detection
- No TTY/agent detection in command-output. Format is explicit; TOON default for machine-result commands is unconditional. (AI_AGENT env is only used by harness detection src/detection/detect-harness.ts:254: OpenHands sets AI_AGENT=openhands; "unset AI_AGENT and CLAUDE* variables before a nested capture or the outer session's values leak in", plans/github-33.plan.md.)
  Lesson for the shared package: if agent-vs-TTY auto-detect is added, AI_AGENT is the one cross-vendor env var, others are vendor-specific.

### 3.7 Hosting model
- Commands are exported as factories (`createReferenceCommand({ plugin: { name, root } })`) so another clibuilder CLI can host them; encoders exported from `@cyberuni/agent-harness/command-output`.
- Skill ships a bundled `scripts/reference.mjs` (no node_modules needed) and the skill forbids npx/pnpm dlx fallbacks.
- README (readme.md:291): "Output is TOON by default, for an agent to parse; pass --format json or --format text".

=====================================================================
## 4. Cross-check against the stated @clibuilder/axi list
=====================================================================
Stated: formatOption / defineFormatOption / parseFormat / createOutput(result, document, renderers) / writeResult / writeDocument / encodeResult / renderText(tables, bullets, "(none)").
- parseFormat, writeResult, writeDocument, encodeResult (private there), renderText (tables, bullets, `(none)`): ALL come from agent-harness (command-output.ts), NOT cyberplace.
  Cyberplace has none of those names. formatOption/defineFormatOption/createOutput appear in NO repo searched: closest are agent-harness `listFormatOption` const (reference.command.ts:231) and per-command inline `format` option objects.
  (They were probably designed in clibuilder itself.)

### Things in these repos NOT in that list (candidates to cover)
From cyberplace:
 1. `renderToonTable(key, items, cols)` encoder with header `key[N]{cols}:` + indent-2 rows + quoting (cyberplace output.ts:26-48). agent-harness relies on `@toon-format/toon` encode() instead (handles nested objects; renderToonTable is table-only).
 2. Truncation: threshold 20 rows, `… +N lines — rerun with --full` hint on stdout, `--full` flag, json never truncated (also for long text documents).
 3. Aggregate/summary line (`summary: N crews`, `built N, skipped M, failed K`, `N skills across M scopes`) with singular/plural, placed on stdout inside the machine result.
 4. Definitive-empty-state strings per noun (`0 crews found`, `no sources configured`) with exit 0.
 5. Next-step hint on STDERR: `→ <cmd>\n`, emitted for json as well; "ends with" semantics.
 6. Content-first group default (bare group runs its `list`/status subcommand), and help with `Example:` footer via addHelpText('after').
 7. Hidden `--json` alias (`new Option('--json').hideHelp()`) + legacy `--format agent`; `isAutomatedOutput()`; `isInteractive()` TTY check (stdin AND stdout isTTY); no-prompt non-interactive default.
 8. JSON payload grouped by status (`built/skipped/failed` arrays + `summary` + `warnings`) separate from TOON rows.
 9. `warn: <msg>` stderr prefix; partial failure sets `process.exitCode = 1` yet still prints the result; `try/catch -> stderr message + exit(1)`.
 10. printTable / printFields legacy human renderers (padded, uppercase header, `(none)`).
 11. Minimal-schema rule (3-4 TOON columns) while JSON keeps the full record.
 12. Unknown flag fails loud (exit 1, stderr names the flag) and invalid enum flags (`Expected --layer local|repo|global`).
 13. Governance/document truncation (documents too, not just tables); "small doc never shows hint".
 14. Idempotent mutation + no-op messaging (`nothing to bundle` on stderr; re-add exit 0).
 15. Three archetypes (dual-audience / always-JSON runtime hook / markdown-on-stdout) -- documents vs results at ADR level.
 16. Contract-vs-impl gap: spec promises structured error `code`; no repo implements it.
From cyber-sdd (not in list; mostly engine-side):
 17. Semicolon-joined inline lists `key[N]: a;b;c` and scalar `key: value` TOON lines; mixed multi-section TOON (`scenarios[..]`, `extras[..]`, `summary{cols}:` one-row table).
 18. `--check` CI mode vs default audit mode (exit non-zero iff findings; audit always 0); `--format` + `--status` filters; required-flag errors to stderr exit 1.
 19. Error-as-TOON on stdout (`blast-estimate: error="..."` + exit 1) vs stderr text -- inconsistent, avoid.
 20. Strict enum validation helper pattern (`parseDeclared` returns null -> fail loud) and reason (typo must not fabricate a finding).
 21. Test-the-flag-path lesson (mutation caught hard-coded format) and "exact `${render}\n`" assertion that stdout is exactly render + newline.
 22. verify-scenarios: default `text` with `PASS/FAIL/UNBOUND` rows + `N/M BOUND` summary; exit code derived from the result (`exitCode(report)`).
From agent-harness (beyond list):
 23. `collapseHome(home, path)` (portable `~` paths) -- AXI "§10" per the comment (note: there it is labelled §10, though AXI #10 = per-subcommand help in cyberplace's numbering; cite carefully).
 24. Per-command default format (document cmds default `text`, result cmds default `toon`) and a shared format option const.
 25. Empty state as string-in-place-of-array (`references: '0 references — no layer holds one'`), omit `warnings` when empty, always-present `warnings` for per-entry reports.
 26. `fail(error, fallback)` -> `error: <message>` on stderr + exitCodes.error(1); parser/usage errors exitCodes.usage(2); `run()` returns code not process.exit.
 27. Document vs result rule: verbatim document bypasses encoders; wrapper `<reference name tier>…</reference>` for multi-doc; unresolved -> self-closing marker + stderr error; single unresolved -> empty stdout.
 28. warnings/trace routing: stderr in text mode, in-payload in toon/json.
 29. `--dry-run` semantics and `next` ("what answers after this") state report; `--trace`; no-clobber `wx`.
 30. Strict `parseFormat` (no silent fallback) -- cyberplace/cyber-sdd both silently fall back to TOON on unknown format.
