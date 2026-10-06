# AXI conventions catalogue (for @clibuilder/axi)

Paths: EFF = ~/code/unional/unional.github.io/.research/axi-agent-consumption-effectiveness/
CP  = ~/code/cyberuni/cyberplace/.research/cli-output-format/conclusion.md
SDD = ~/code/cyberuni/cyber-sdd/.research/strain-kind-discriminator/
UP  = upstream https://github.com/kunchenguid/axi (README, .agents/skills/axi/SKILL.md, packages/axi-sdk-js/src/{cli,output,errors}.ts, VISION.md)

NOTE: the local ~/.claude/skills/axi/SKILL.md that EFF cites does not exist on this machine; the upstream SKILL.md (fetched via gh) is the AXI text. EFF's section numbers (§1..§10) match upstream's.

======================================================================
## PART A. Per-source sections
======================================================================

### A1. Upstream AXI (UP) -- the baseline spec

10 principles (README table, generated from principles.yaml):
1 Token-efficient output: TOON on stdout (~40% savings vs JSON); convert at output boundary, keep internals JSON.
2 Minimal default schemas: 3-4 fields per list item; high default limits; long text only in detail views; `--fields` flag for extras.
3 Content truncation: truncate large text, show total size, `--full` escape hatch; 500-1500 char limit.
4 Pre-computed aggregates: total counts + cheap derived status fields.
5 Definitive empty states: explicit zero with context.
6 Structured errors & exit codes: idempotent mutations, errors on stdout, no prompts, fail loud on unknown flags.
7 Ambient context: explicit opt-in setup command installs SessionStart hooks (Claude Code, Codex, OpenCode); also ship installable skill.
8 Content first: no-args shows live data, not help.
9 Contextual disclosure: a few next-step hints after output.
10 Consistent help: home header with `bin:` + `description:`; per-subcommand --help; `--version` fast path.
Upstream benchmarks (Claude Sonnet 4.6): gh-axi 100% success, $0.050, 3 turns vs gh CLI 86%/$0.054, GitHub MCP 87%/$0.148/6 turns; chrome-devtools-axi 100%/$0.074/4.5 turns vs MCP variants $0.091-0.120, 6.2-7.6 turns.
VISION.md: new principles / behavioural changes require rigorous validation across agents/models/tasks; SDK holds only common-denominator facilities.
NOT in upstream: TTY vs agent detection, a format/--json/--format flag, `--quiet`, pagination flags. Upstream is TOON-only on stdout; there is no human mode.

Upstream SDK (axi-sdk-js) concrete behaviour (cli.ts/output.ts/errors.ts):
- Command-first CLI: `<bin> <command> ...args ...flags`; flags before the command are rejected:
  `error: Flags must come after the command` / `code: VALIDATION_ERROR` / `help[2]:` (two lines: Run `<bin> <command> [args] [flags]`; Move `<flag>` after the command instead of before it), exit 2.
- Error object: keys `error`, `code`, optional `help` (array when suggestions given). Rendered via TOON encode; written to STDOUT; trailing "\n".
- Exit codes: `exitCodeForError`: AxiError with code === "VALIDATION_ERROR" -> 2, everything else (incl. code "UNKNOWN" for non-AxiError) -> 1. Unknown command -> `error: Unknown command: X`, `code: VALIDATION_ERROR`, help `Run \`--help\` to see available commands`, exit 2. Missing version config -> VALIDATION_ERROR, exit 2.
- Bare `--help` (argv length 1) prints topLevelHelp + built-in footer; `-v`/`-V`/`--version` prints bare version + "\n", exit 0. `<cmd> --help` prints getCommandHelp(cmd).
- Home view (no args): output merged with header `bin: <argv[1] with $HOME collapsed to ~>` and `description: <one sentence>` first; handler-supplied bin/description overridden.
- Built-in reserved command `update` (+ `update --check` / `--dry-run`): output
  `update:\n  package: gh-axi\n  current: 1.2.3\n  latest: 1.3.0\n  available: true\nhelp[1]: Run \`gh-axi update\` to upgrade`.
- EPIPE on stdout = normal exit 0 (`my-axi list | head`).
- Handler may return string (raw) or object (TOON-encoded). Help arrays render as `help[N]: ...` (inline) or `help[N]:` + indented lines.
- `tryFastPath` from `axi-sdk-js/fast-path` (zero-import subpath) for sub-ms --version; VERSION must live in a leaf module.

### A2. EFF -- axi-agent-consumption-effectiveness (own research, July 2026; "authoritative")

Files read: topic.md, evidence.md (C1-C22), measurement.md, conclusion.md, changes.md, proposed-axi-amendments.md, bench/{README.md,bench.mjs,bench2.mjs,bench3-affordances.mjs,bench4-segregation.mjs}.
Verdict: "AXI is effective. Its section 1 TOON mandate is right for collections, wrong for every other output shape, and its biggest gap is the command surface rather than the output format."

Measured (tokens only, o200k_base via gpt-tokenizer; NOT a Claude tokenizer; relative ordering transfers):
- List `tasks list` {number,title,state,assignee}: TOON vs JSON-compact -25.8% (N=3), -30.4% (5), -35.5% (15), -37.9% (100), -38.2% (1000). vs pretty JSON -59.6%..-65.5%. vs YAML -40.3..-52.4%. vs TOML -41.0..-54.1%.
  Raw tokens N=3/15/100: TOON 46/198/1256; JSON compact 62/307/2022; pretty 114/551/3626; YAML 77/394/2619; MD table 55/216/1336; MD light 33/182/1217; CSV 35/163/1051.
- TOON `[N]{fields}` header = fixed 12 tokens = 26.1% of output at N=3, 6.1% at N=15, 1.0% at N=100. Never flips comparison vs JSON/YAML/TOML.
- Lightly formatted Markdown (`- #1 Fix auth bug — open (alice)`) is CHEAPER than TOON at every N (TOON +39.4% at N=3, +8.8% at 15, +2.4% at 1000). MD table within 5.5-16.4% of TOON and keeps field names. What MD-light drops = field names, row count, field count (TOON's header metadata).
- CSV cheaper than TOON by 19-31% on narrow rows, only 1.4% on wide rows (8 fields, long values; 650 vs 659 tok).
- Detail view (7 fields, one 190-char body): JSON compact 76 < MD-KV 78 < TOML 82 < TOON 85 (+12%) < YAML 89 < pretty JSON 102. TOON quotes strings containing delimiters (body contains `: `) so whole body is quoted. AXI section 1 vs section 3 conflict.
- Error: plain `key: value` / YAML 20 tok; TOON and JSON-compact 24 (+20%). Real TOON output is
  `error: "--title is required"` / `help: "tasks create --title \"...\" [--body \"...\"]"`  (quoted+escaped); AXI's own examples print the unquoted form (`error: --title is required`), i.e. NOT valid TOON encoder output. Empty state: TOON 10 tok, plain 10, JSON 11.
- 40-call session (20 lists N=15, 15 details, 5 errors): TOON 5,215 tok; JSON compact 7,060; pretty 12,360. Saves 1,845 (-26%) vs compact, 7,145 (-58%) vs pretty; at ~600 tok/avoided follow-up call (unvalidated) = ~3 / ~12 saved turns. (Retracts earlier claim format is clearly second-order.)
Published-benchmark evidence (secondary, from TOON suite and improvingagents):
- TOON 72.2% +/-2.8 at 2,474 tok vs JSON pretty 71.4% +/-2.8 at 4,308 tok (-42.6% tokens) = statistical tie on accuracy. Acc/1K tok: TOON 29.2, JSON-compact 23.8, YAML 20.1, JSON 16.6, XML 14.4. Mixed-structure track: +1.6% vs JSON compact; semi-uniform logs TOON +19.9% worse than compact JSON.
- TOON is last on field retrieval (97.8% vs CSV 100/YAML 99.7/JSON 99.2) and mid-pack on filtering (38.0% vs JSON 41.1%); leads on structure awareness (90.3%) and structural validation (100% vs 50%, partly an artifact: corruption applied post-encoding).
- improvingagents (GPT-4.1-nano, 1000 records): Markdown-KV 60.7 > XML 56.0 > INI 55.7 > YAML 54.7 > JSON 52.3 > MD-Table 51.9 (at 38% of JSON tokens) > natural language 49.6 > JSONL 45.0 > CSV 44.3 > pipe 41.1. Key repetition helps retrieval. TOON untested. Plain prose dominated on both axes.
- Model dependence: gpt-5.4-nano XML>JSON>TOON; grok-4.5 94.5-97.1% on every format -> format sensitivity vanishes for capable models; for frontier agents cost is the only lever.
- TOON must be shown, not described (README); teaching cost can erase savings on short output (unmeasured). TOML: no LLM benchmark; no top-level arrays, no tabular factoring -> unfit for lists. TOON spec v3.3 is a Working Draft ("an idea in progress"); ONTO preprint claims to beat it.
Nested command groups (no measurements, analogy only): noun-verb two levels is agent-friendly (consensus); every level costs a discovery round-trip; ETOM (MCP) shows accuracy falls with namespace depth AND breadth; tool-definition bloat 50K-134K tokens, so manifest must be behind an explicit command not the session hook.
bench3-affordances.mjs: compares home-view TOON data alone vs + names-only vs + names&args vs + full signatures (`commands[5]{path,summary,args,flags,exit}:`) vs a separate `--help` call. bench4-segregation.mjs: tmux-shaped surface (12 nouns, ~70 commands), full schema vs per-noun slice (break-even in slices). Neither script's RESULTS are recorded in any .md (no numbers available; re-run needs gpt-tokenizer + @toon-format/toon).
Open questions in EFF: accuracy at AXI payload sizes for any format (biggest gap); frontier-model format sensitivity; real turn cost of 3- vs 2-level nesting; TOML accuracy; TOON spec stability.

### A3. CP -- cyberplace cli-output-format (May 2026)

Question: best CLI output format for LLM consumption. Findings:
- JSON mode hurt reasoning 10-15% (Tam et al. 2024); `{"sentiment":"positive"}` ~40% more tokens than prose.
- Markdown/text read natively; Markdown retrieval +20-35% vs HTML/plain (Webex); up to 80% fewer tokens than HTML.
- JSON for machine-to-machine; MCP 2025-06-18 `structuredContent` plus recommended TextContent fallback.
- Verbosity is #1 real-world failure: paginate or summarize.
- STDIO transport: stray stdout corrupts the stream; logs/diagnostics to stderr.
- CLI via bash 10-32x cheaper on context than MCP (Pulumi); `--help` quality = tool description.
- Consensus: layered -- agent-reasoning layer = Markdown/structured text; machine-execution layer = flat JSON (explicit types, no $ref/oneOf, max 3-4 fields, text fallback).
Format matrix: agent reads -> plain text/Markdown; non-LLM parses -> flat JSON; both -> JSON + TextContent fallback; high-volume pipelines -> TOON or TSV; large payloads -> paginate/summarize.
Flag naming candidates: `--format json|text`, `--machine`, `--porcelain`, `--structured`.
DECISION (ADR-0004, cyberplace): `--format json` is the machine-output flag for all dual-audience commands; `--json` kept as hidden backward-compat alias. (ADR file itself ../../artifacts/adr/0004-cyberplace-cli-output.md not in the research folder; not read.)
Does not mention TOON as default, TTY detection, counts, empty states, exit codes.

### A4. SDD -- strain-kind-discriminator

Not AXI research. Only AXI/TOON content: an illustrative worked example where a governance has criteria "every command supports `--json`" (g1) and "adds `--toon`, introduced later" (g2), used to show how a criterion should live on its own connection. Implies the cyber-sdd ecosystem treats `--json` and `--toon` as sibling output flags, with `--toon` added after `--json`. No output-format rules. (topic.md/evidence.md; there is no conclusion.md; topic is open/paused.)

======================================================================
## PART B. Consolidated RULES
======================================================================
Status legend: [UP] upstream AXI as published; [EFF-C] concluded in EFF; [EFF-P] proposed amendment (EFF proposes, not adopted upstream); [OPEN] unresolved; [LOCAL] cyberplace decision.

### B1. Output format
R1. Stdout is TOON for collections: `tasks[2]{id,title,status,assignee}:` then 2-space-indented CSV-ish rows. Example:
```
tasks[2]{id,title,status,assignee}:
  "1",Fix auth bug,open,alice
  "2",Add pagination,closed,bob
```
 Why: -26% to -38% tokens vs compact JSON at N=3..1000; the `[N]{fields}` header is the only native way to make truncation/field loss detectable (EFF's "defensible case"). Source: UP SKILL s1; EFF measurement.md R1, conclusion.md. [UP, EFF-C for collections]
R2. SCOPE TOON TO COLLECTIONS ONLY. Single objects, errors, empty states: plain `key: value` lines (nested objects indent 2 spaces). TOON costs +12% on a detail view, +20% on an error vs plain. Proposed wording: "Use TOON's tabular form for collections. For single objects, errors, and empty states, plain `key: value` lines are cheaper and are what the examples in this document show." Source: EFF proposed-axi-amendments.md (4th amendment), measurement.md R4/R5. [EFF-P, flagged "for a separate decision", not adopted]
    IMPLEMENTATION NOTE: a real TOON encoder quotes `error: "--title is required"`; upstream examples are unquoted. Pick one and make the package deterministic (EFF recommends unquoted plain for non-collections; upstream SDK actually runs everything through TOON `encode`, so upstream SDK output is the quoted form).
R3. Convert at the output boundary; keep internal data JSON. Source: UP s1; EFF conclusion (TOON docs agree). [UP]
R4. Value of TOON is cost, not accuracy (72.2 vs 71.4, CIs overlap). Do not claim accuracy gains. [EFF-C]
R5. JSON available as an explicit machine format: `--format json` (cyberplace) with hidden `--json` alias; `--toon` appears as a sibling flag in cyber-sdd example. Upstream has no flag at all (TOON-only). Plain-text/Markdown for agent-reasoning output is CP's recommendation; EFF finds natural-language prose dominated and Markdown-light cheapest. Sources: CP; SDD topic.md; EFF. [LOCAL / DISAGREEMENT, see B9]
R6. Stdout vs stderr: stdout = all structured output the agent consumes (data, errors, suggestions); stderr = debug, progress, diagnostics. Never mix progress ("Fetching data...") into stdout. Source: UP s6 "Output channels"; CP (STDIO rule). [UP]
R7. EPIPE on stdout is a normal exit 0 (`cmd | head`). Source: UP SDK. [UP-SDK]

### B2. Schemas, fields, limits
R8. Default list schema 3-4 fields (id, title, status). Default limit high enough for common cases in one call (e.g. <100 labels -> default 100, not 30). Long-form bodies only in detail views. Source: UP s2. [UP]
R9. `--fields a,b,c` flag requests additional fields explicitly. (No exact syntax in any source beyond "`--fields` flag"; EFF's manifest example lists `--fields` on `tasks list` and `tasks view`.) Source: UP s2; EFF amendment 2. [UP]
R10. Wide rows narrow the TOON-vs-CSV gap (1.4%); do not widen defaults. Source: EFF measurement R3. [EFF-C]

### B3. Truncation
R11. Truncate long text in detail views, never omit entirely; show total size; offer `--full` only when actually truncated; limit 500-1500 chars. Literal:
```
task:
  number: 42
  title: Fix auth bug
  state: open
  body: First 500 chars of the issue body...
    ... (truncated, 8432 chars total)
help[1]: Run `tasks view 42 --full` to see complete body
```
Marker string: `... (truncated, N chars total)`. Source: UP s3. [UP]
R12. Truncated LIST: when showing most recent N of larger total, add a help hint "Run 'mytool list' for all 47 items"; do NOT encode pagination into TOON array headers. Source: UP s9. [UP]
R13. Truncation detectability: the TOON `[N]` count must equal rows actually shown (30 in `tasks[30]` with `count: 30 of 847 total`). EFF: header is the structural guarantee against silent row loss. [EFF-C rationale]

### B4. Counts and aggregates
R14. List output includes total: literal first line `count: 30 of 847 total`, then `tasks[30]{number,title,state}:` rows. Agents paginate if the total isn't definitive. Source: UP s4. [UP]
R15. Derived status fields inline in detail views (cheap summaries only): `checks: 3/3 passed`, `comments: 7`. Source: UP s4. [UP]
R16. Rationale: the expensive cost is the follow-up call, not a longer response (~600 tok per avoided follow-up, unvalidated EFF estimate). [UP+EFF]

### B5. Empty states
R17. Say the zero explicitly with context and make clear success: literal
`tasks: 0 closed tasks found in this repository` (for `tasks list --state closed`), exit 0.
EFF measured: definitive empty state 10 tok in TOON/plain, 11 JSON (no format penalty). The sources contain NO "(none)" or "0 items" convention; the upstream form is `<collection>: 0 <qualified noun> found in <scope>`. Source: UP s5; EFF measurement R5. [UP]

### B6. Errors and exit codes
R18. Errors go to STDOUT in the same structured format. Literal (SKILL):
```
error: --title is required
help: tasks create --title "..." [--body "..."]
```
SDK adds a `code` key: `error`, `code` (e.g. VALIDATION_ERROR, UNKNOWN), optional `help` (string or array -> `help[N]: ...`). Source: UP s6 + SDK output.ts. Note: SKILL example omits `code`; SDK emits it.
R19. Exit codes: 0 = success incl. idempotent no-ops; 1 = error; 2 = usage/validation error (missing required flag, unknown flag, unknown command, flag before command). SDK: only code "VALIDATION_ERROR" -> 2; everything else 1. Source: UP s6 + SDK errors.ts.
R20. Idempotent mutations: desired state already true -> exit 0 `task: #42 already closed (no-op)`. Source: UP s6. EFF notes this absorbs the failure EFF-P amendment 3 would prevent; keep both. [UP]
R21. Never leak raw dependency output / stack traces / dependency names; translate to the CLI's own commands. Validate required flags before any dependency call. Source: UP s6. [UP]
R22. No interactive prompts; every op completable with flags alone; missing required value fails immediately. Suppress wrapped tools' prompts. Source: UP s6. [UP]
R23. Fail loud on unknown flags/args, exit 2, before any dependency call, per-subcommand flag sets, `--help` always allowed. Literal:
```
error: unknown flag --stat for `list`
help: valid flags for `list`: --state, --assignee, --limit (--help always allowed)
```
Renamed flags get targeted hint: `--status was renamed; use --state instead`. Self-correcting: inline valid flags or the concise --help block beneath the error. Source: UP s6. [UP]
R24. Errors should name the command that fixes the problem, not "see --help". Source: UP s9. [UP]
R25. Unknown command: `error: Unknown command: X` / `code: VALIDATION_ERROR` / help "Run `--help` to see available commands", exit 2. Source: UP SDK. [UP-SDK]

### B7. Next-step hints / contextual disclosure / home view
R26. `help[N]:` block after list and mutation outputs; each line a complete command or template. Literal:
```
help[2]:
  Run `tasks view <id>` to see full details
  Run `tasks create --title "..."` to add a task
```
Single-line form: `help[1]: Run \`tasks view 42 --full\` to see complete body`. No `→ cmd` arrow convention exists in ANY source. Source: UP s8/s9. [UP]
R27. Hint rules: relevant; actionable (carry forward disambiguating flags like --repo/--source); parameterize runtime values as `<id>`, `"<title>"`; omit hints when output is self-contained (detail view, count, confirmation); a few, guide discovery not workflows; resolve errors. Source: UP s9. [UP]
R28. Home view: no-args prints live content, not usage; starts with `bin: ~/.local/bin/tasks` (absolute path, $HOME -> `~`) and `description: <one sentence>`. Source: UP s8/s10 + SDK. [UP]
R29. `-v`, `-V`, `--version` print bare version, exit 0, via dependency-free fast path (leaf module for VERSION). Source: UP s10. [UP]
R30. Every subcommand `--help`: flags with defaults, required args, 2-3 examples, scoped to that subcommand. Source: UP s10. [UP]
R31. Ambient context: explicit setup command installs SessionStart hooks (Claude Code, Codex, OpenCode); never from ordinary commands; idempotent; directory-scoped; token-minimal; plus installable skill generated from the home view with a CI `--check`. Source: UP s7. [UP]

### B8. Proposed amendments (EFF) -- all PROPOSED, none adopted upstream; none validated by agent-accuracy experiments
A1 (Shallow command groups, new s11): `noun verb`; two levels target, three ceiling; prefer flags over levels (`tasks list --archived` not `tasks archived list`); consistent verbs across nouns (list/view/create/close); group nodes show content not menu; ~12 verbs/noun max; validate flags at owning level. Confidence moderate (2-level), low-moderate (depth penalty). [EFF-P]
A2 (Surface manifest under s10): `mytool schema` prints whole command surface in one TOON table; mark required flags `--title*`; generate from the parser; keep OUT of session hook; mention in home-view help. Literal:
```
bin: ~/.local/bin/tasks
commands[6]{path,summary,args,flags,exit}:
  tasks list,List tasks,,--state --assignee --limit --fields,0|2
  tasks view,Show one task,<id>,--full --fields,0|1|2
  tasks create,Create a task,,--title* --body --assignee,0|2
help[1]: Run `tasks <command> --help` for flag defaults and examples
```
 bench3/bench4 explore sizing of inline affordance blocks and per-noun slices (`schema <noun>`) but have no recorded results. [EFF-P; bench results not recorded -> OPEN]
A3 (Replace s9 with state-conditional typed affordances): `next[N]{rel,cmd}:` two columns; fixed rel vocabulary (`self,item,collection,next,create,edit,retry` + domain verbs); omit invalid transitions (closed task has no `close`); when in doubt include; reasoning only, unmeasured. Literal:
```
next[3]{rel,cmd}:
  close,tasks close 42
  comment,tasks comment 42 --body "<text>"
  collection,tasks list --state open
```
 [EFF-P, explicitly "reasoning only, unmeasured"]
A4 (Scope s1 to collections) = R2. [EFF-P]
Upstream VISION.md requires rigorous multi-agent validation before changing principles, so all A1-A4 would need evidence upstream.

### B9. Disagreements / tensions between sources
D1. Default format: UP mandates TOON for everything; EFF says TOON only for collections (plain key:value elsewhere); CP says Markdown/plain text for agent reading, flat JSON for machines, TOON/TSV only for high-volume pipelines, and adopted `--format json`. EFF also finds MD-light cheaper than TOON at every N but loses count/field metadata.
D2. Accuracy: TOON publisher/UP imply "agent-friendly"; EFF shows tie, TOON last on field retrieval; improvingagents ranks Markdown-KV first (repetition helps). CP: JSON mode harms reasoning 10-15% (Tam) -- EFF found JSON-vs-TOON accuracy equal on retrieval Q&A; different task types.
D3. Upstream examples (unquoted `error: --title is required`) vs real TOON encoder output (quoted/escaped); upstream SDK actually TOON-encodes errors, so the SDK output differs from its own SKILL examples. Also SKILL error example lacks `code`, SDK adds it.
D4. Hints: UP s9 relevance-ranked prose `help[]`; EFF-P A3 wants state-conditional typed `next[{rel,cmd}]`.
D5. Pagination: UP says don't encode in array headers (use help hints); `count: N of M total` line is the count mechanism.
D6. Exit codes: UP SKILL says 2 = usage error; SDK only maps code VALIDATION_ERROR to 2.
D7. No TTY/agent detection anywhere: UP has no human mode, CP uses explicit flag. The package must choose (suggestion: explicit flag + env, not TTY sniffing, since no source recommends sniffing).

### B10. Gaps in the sources (the package must decide)
- TTY vs agent detection: NOT covered in any source.
- Exact `--fields` syntax, `--limit`/pagination flag names: only mentioned, not specified (`--limit` and `--fields` appear in examples).
- "(none)"/"0 items" literal: not used; use `<noun>: 0 <qualifier> <noun> found in <scope>`.
- `→ cmd` hint lines: not used; hints are `help[N]:` lines starting "Run `cmd` ...".
- Accuracy at AXI payload sizes: unmeasured for any format.
