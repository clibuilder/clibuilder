# AXI catalogue from the OLD WSL distro (Ubuntu)

All sources are `old-WSL: <repo>/<path>` (repos under `~/code/cyberuni/`). Read-only. The upstream AXI framework is https://github.com/kunchenguid/axi ("10 principles"); no local copy exists, so every statement of the principles below is a secondary restatement by the author's own specs (and one of those restatements was found wrong, see section 9).

Repos with an AXI adoption: gherkin-cli (newest, cleanest), cyber-mux, cyber-asana, cyberplace.old (marketplace CLI + cyberlegion + universal-plugin). cyberplace (the new repo) has NO AXI; it has a different older "agent-tool-output" doctrine (section 10).

## 1. The ten principles (verbatim lists as stated in the specs)

Short names, from the plan brief (old-WSL: cyberplace.old/.agents/plans/axi-conformance.plan.md):
"1 TOON output · 2 minimal schemas (3-4 fields) · 3 truncation + `--full` · 4 pre-computed aggregates · 5 definitive empty states · 6 structured errors/exit codes, no interactive prompts, fail-loud on unknown flags · 7 ambient context (setup cmd + skill) · 8 content-first (no-arg = live data) · 9 next-step suggestions · 10 per-subcommand help."

ADR form (old-WSL: cyberplace.old/packages/universal-plugin/.agents/spec/design/decisions/0003-adopt-axi.md): "token-efficient TOON output, minimal default schemas, content truncation with a `--full` escape, pre-computed aggregates, definitive empty states, structured errors / exit codes / no prompts / fail-loud, ambient context (a session-hook setup command plus an installable Agent Skill), content-first no-argument behavior, next-step suggestions, and consistent per-subcommand help."

gherkin-cli contract list (old-WSL: gherkin-cli/.agents/specs/gherkin-cli/axi/README.md, newest wording):
1. Token-efficient output - TOON by default; `--format json` explicit escape; free-form prose never default for a structured result.
2. Minimal default schema - scenario row `name, keyword, tags` (3 fields); detail via `--full`.
3. Truncation + `--full` - `… +N lines — rerun with --full`; `--format json` never truncated.
4. Pre-computed aggregates - a `summary` of counts in the payload (parse: files/scenarios; validate: files/errors; diff: added/modified/removed/unchanged + `addOnly`).
5. Definitive empty states - `0 scenarios across 0 files`, `0 errors`, `0 changes (all unchanged)`, exit 0, never blank.
6. Structured errors, exit codes, no prompts, fail-loud - stable `code` + message honoring `--format`, on stdout; exit 0 success / 1 operation failure / 2 usage error; never prompt; unknown flag -> `EBADFLAG`, exit 2, naming valid flags.
7. (ambient context - out of scope for a leaf CLI)
8. Content-first - bare binary shows the single most useful live view, not a usage manual.
9. Next-step suggestions - every command ends with a `help[n]` block on stdout.
10. Consistent help - every subcommand `--help` = synopsis, flags, one example.

Principle text recovered from cyber-mux's direct reading of upstream (old-WSL: cyber-mux/packages/cyber-mux/.agents/spec/axi.md, ledger 36-axi-error-surface.e9e767.jsonl; quotes of AXI):
- stdout = "all structured output the agent consumes — data, errors, suggestions"; stderr = debug/progress that "agents don't read".
- #6 exit set: `0` success (including no-ops), `1` error, `2` usage error (unrecognized flag/argument, missing required parameter).
- #8 scope: bare binary "running your CLI with no arguments", example `$ tasks`. It says NOTHING about a command group with no subcommand.
- #9: a suggestion is OMITTED when output is self-contained (detail view, count, confirmation); use placeholders for dynamic values (`<pane>`), never a guessed concrete id; on error the suggestion names the command that fixes it; "Reveal truncated lists" is a named #9 case; suggestions are rendered as a `help[N]:` block inside the stdout payload.
- #10 has two halves: per-subcommand `--help` (flags with defaults, required args, 2-3 examples), AND the no-argument view identifies the tool: current executable absolute path with `$HOME` collapsed to `~`, plus a one-sentence description, before live data.
- Dependency hygiene: "never leak a dependency's name or text" (backend diagnostics are translated, not forwarded) - from cyber-mux CHANGELOG 5de47c3.

## 2. Format rules with literal strings (from the best/newest implementation, gherkin-cli)

Source: old-WSL: gherkin-cli/packages/gherkin-cli/src/output.ts, src/cli.ts, apps/website/.../concepts/toon.md.

- Default format TOON; flag `--format <fmt>` with `toon | json` (default `toon`); `Format = 'toon' | 'json'`. Global option plus per-command. Format pre-scanned from argv (`--format json`) for the error path before the arg parser runs.
- No TTY detection anywhere in gherkin-cli: agent-first is unconditional, no human mode. (Only cyber-mux/cyberplace use `process.stdin.isTTY` to suppress prompts: `if (!process.stdin.isTTY || isAutomatedOutput())`, cyber-mux src/cli.ts:997; cyberplace.old src/registry/prompt.ts `isTTY` both stdin and stdout.)
- TOON encoder rules (hand-rolled, deterministic):
  - scalar: `key: value`; strings with comma/colon/whitespace/brackets/braces/quote or empty are quoted with `"..."` (`\"` escaped); null/undefined -> `null`.
  - scalar arrays inline: `featureTags: [@auth]`.
  - uniform object arrays tabular: header `name[N]{col1,col2}:` then one indented comma-joined row per item.
  - nested object arrays: `key[N]:` followed by `- `-prefixed indented blocks.
  - nested object: `key:` + indented block. Indent = 2 spaces.
  - example:
    ```
    summary:
      files: 1
      scenarios: 2
      errors: 0
    files[1]:
      - file: a.feature
        featureTags: [@auth]
        scenarioCount: 2
        scenarios[2]{name,keyword,tags}:
          "Successful login",Scenario,[@smoke]
          "Failed login",Scenario,[]
    ```
  - cyber-asana toon encoder (old-WSL: cyber-asana/packages/cyber-asana/src/toon.ts) differs slightly: quotes `,:"\n`, leading/trailing space, reserved words true/false/null, and numeric-looking strings only when they would not round-trip (leading zeros); plain integer GIDs stay unquoted "to keep GID-heavy output token-efficient". cyberlegion's `toonList` doubles `"` inside quotes (CSV style) - a third quoting convention.
  - cyberlegion list (old-WSL: cyberplace.old/packages/cyberlegion/src/output.ts): `name[N]{field,...}:` header + rows + a trailing aggregate line; "Definitive on empty — still emits `name[0]{...}:` plus the summary line."
- Claimed saving: TOON "~40% fewer tokens than JSON" (cyberplace.old axi/README, universal-plugin axi/README; cyber-asana toon.ts "~40%").
- Truncation: threshold `TRUNCATE_THRESHOLD = 50` rendered lines; marker line `… +${remaining} lines — rerun with --full` (U+2026 ellipsis, em dash); applies to TOON only; `--format json` never truncated; `--full` disables. Validate variant in universal-plugin feature: `… +N more — rerun with --full`. Mux `read` truncation: `truncated` field plus a `help:` entry naming `--full`; `--lines <n>` bounds, `--full` whole scrollback, both = usage error exit 2; complete capture stays raw bytes so `read | grep` works. cyber-asana text truncation: limit 500 chars, `… [truncated, N chars total; use --full for the rest]`, applied only in readable text branch (never corrupts JSON).
- `--full` has TWO meanings in gherkin-cli (add schema fields AND skip truncation) - recorded as a known smell; "splitting it is a breaking change" (PR #12 body). `diff` omits `unchanged` scenarios by default, `--full` includes them (0.2.0, breaking minor).
- Other flags seen: `--format toon|json|text|agent`, `--tag <name>`, `--ast` (raw dump ignoring projection), `--base <ref>`, `--lines`, `--limit/--offset/--opt-fields/--all/--max-pages` (cyber-asana pagination; `--limit` int 1-100; `--all` with `--offset` is a usage error), `--yes` (compat no-op once non-interactive), `--verbose` (gates human diagnostics on stderr), `--dry-run`, `--toon`/`--json` (cyber-asana per-format flags). `--fields` is named in cyber-mux docs as the AXI #2 lever but is NOT built anywhere ("`--fields` / `--full`", cyber-mux docs/design/worktree-disposability.md line ~244: "The general lever already exists in the contract and is unbuilt").
- Aggregates inside payload (gherkin-cli): `summary` object. Aggregate strings from specs: `3 skills across 2 sources`, `installed 2 skills, skipped 1`, `2 skills across 1 scope`, `1 result across 1 marketplace`, `1 provider across 1 scope`, `migrated 2 entries`, `rendered 3 entries`, `built 2, skipped 0, failed 0`, `2 schema violations, 0 vendor violations`, `2 governances across 2 scopes`, `created 1`, `2 sources across 2 layers`, mux `N panes across the <backend> backend`.
- cyber-asana: aggregates/next steps are TEXT MODE ONLY (`printSummary` returns silently under --json/--toon: "a structured consumer computes its own aggregate and a stray prose line in a JSON stream is a parse hazard"). This conflicts with gherkin-cli, where summary is always inside the payload.
- Empty states (literal): gherkin-cli `scenarios: 0 scenarios found across ${files} file(s)`, `errors: 0 syntax errors across ${n} file(s)`, `changes: 0 scenario changes against ${base} (all unchanged)`, home `features: 0 .feature files found in this directory`; also `count: "1 of 1 total"`. cyberplace specs: `0 results found`, `0 skills installed`, `no providers configured`, `no sources configured`, `0 skills found`, `No skills found`. universal-plugin: `0 governances found`, `nothing to build` (stderr) + stdout aggregate `built 0`. cyber-asana: `0 <entity> found` or `0 results` ("Never `(none)`, never a blank line — an agent cannot distinguish a blank line from a crash"). cyber-mux: `0 panes live` (impl still prints `(none)`). Always exit 0.
  - gherkin-cli quirk: the zero case states itself as a scalar rather than an empty array "so the agent never sees two `features:` keys disagreeing". The empty-state line is emitted AFTER the (empty) result block.
- Idempotent / no-op messaging: mutations idempotent (all specs). cyber-asana: repeat delete succeeds and reports `already_absent: true` (CLI layer only; MCP delete still surfaces the 404). `setup hook` reports `{path, command, already_installed, written}`; `--dry-run` writes nothing. cyberplace specs: `remove`/`update` of unknown skill -> exit 0 with stdout "skill \"ghost\" was not found in the lock file" (AXI #5 no-op as definitive state; "today's code exits 1; impl deferred"). cyberlegion `identity owner` idempotent. `changed: "true"/"false"` in awesome update. mux `exists`: `live` 0 / `gone` 1 / ambiguous 2 (predicate, deliberate divergence, section 6).
- Next-step hints, TOON `help[n]` block on stdout (gherkin-cli):
  ```
  help[2]:
    "gherkin-cli diff --base <ref> features/login.feature"
    "gherkin-cli parse features/login.feature --full"
  ```
  Entries are scalar-quoted strings; block omitted when empty. Hint values are command lines. Batch runs collapse the file arg to the placeholder `<files...>` (single file keeps the real path) - lesson from PR #14 (26-file parse help block was ~6.2KB, "making the token-saving affordance the most expensive thing on stdout"). Per command: parse -> `diff --base <ref> <arg>` + (unless --full) `parse <arg> --full`; validate ok -> `parse <arg>`; validate fail -> `gherkin-cli parse <file> --ast to inspect the failing document`; diff changes -> `parse <arg> --full`, `diff --base <ref> <arg> --full`; diff none -> `parse <arg>`; ENOENT error -> `gherkin-cli — list the .feature files discoverable here`. Home hints: `gherkin-cli parse '**/*.feature' for all N files` (when > cap), `gherkin-cli parse <file> to summarize scenarios`, `gherkin-cli validate <file> to check syntax`, `gherkin-cli diff --base <ref> <file> to classify changes`.
  - Syntax variants across repos (all different): gherkin-cli `help[n]:` + indented quoted lines (stdout); cyber-mux `help[N]: <message>` then `  -> <command>` per entry, structured `{ message, command }` (stdout; printHelp in src/output.ts; JSON form `"help": [...]`); cyberplace/universal-plugin/cyberlegion specs `→ cmd` (U+2192) lines on STDERR (`→ cyberplace add <spec>`, `→ cyberplace list`, `→ universal-plugin plugin validate`, `→ add skills to skills/, then run universal-plugin plugin build`); cyber-asana `\nNext steps:\n  - <cmd — description>` text mode only. Newest gherkin-cli/cyber-mux = `help[N]:` on stdout.
- Hints must use placeholders for dynamic values, be omitted when self-contained (`exists`, counts), and on errors name the fixing command (never "see --help").

## 3. Error output shape, stream, exit codes

gherkin-cli error (TOON, on STDOUT):
```
error: true
code: EBADFLAG
message: "unknown option '--bogus'"
help[2]:
  "valid flags for `validate`: --format <fmt>"
  "gherkin-cli validate --help"
```
JSON form: `{"error":{"code":"EBADFLAG","message":"..."},"help":[...]}`. Codes: `ENOENT | EPARSE | EGIT | EBADFLAG`. Exit: 2 usage (unknown/missing flag), 1 everything else. Commander's own `error:` prefix stripped; valid flags inlined (`valid flags for \`${cmd}\`: --full, --tag <name>, --ast, --format <fmt>`) so the agent self-corrects in one turn; unknown command -> `valid commands: parse, validate, diff`. Commander output suppressed (`exitOverride` + silent `configureOutput`) and replaced. A command either succeeds (payload) or fails (error), never both: "a caller branches on the exit code before parsing" - this is the argument that errors-on-stdout does not corrupt `--format json | jq`. stderr only for the top-level uncaught exception: `error: ${err.message}`, exit 1.
Known inconsistency: `parse` reports `errors: 1` yet exits 0 while `validate` exits 1 ("a product call"). `validate` with errors prints help then `process.exit(1)`.

cyber-mux (old-WSL: cyber-mux/packages/cyber-mux/src/cli-error.ts): `CliError(code, message, help, exit: 1|2, extra?)`; one renderer `reportError` on stdout honoring `--format`; stable kebab codes (`no-mux`, `pane-not-found`, `ambiguous-pane`, `worktree-failed`, `template-not-found`, `invalid-template`, `template-apply-failed`); `help` = THIS CLI's fixing command, never a dependency's name/raw text; unknown flag lists the command's valid flags (validated against the subcommand actually invoked); ambiguous locator = usage error exit 2 with each candidate's id as the retry; bare `send` writes help to stdout and exits 2 (incomplete input).

cyber-asana (old-WSL: cyber-asana/packages/cyber-asana/.agents/spec/axi/README.md): richer exit map: 0 ok; 1 generic; 3 config error or HTTP 401 (deliberately merged); 4 HTTP 403; 5 HTTP 404; 6 HTTP 429. Error `kind: 'asana_api' | 'config' | 'internal'`, API `errors[]` array carried intact (help/phrase text). Command throws, only top-level catch exits (so same op reusable from MCP). Usage-error exit 2 added later (commit 2d58b62 in f4dd3b9: "Commander now throws instead of exiting, tagged with the command that raised it ... exit 2"); `InvalidArgumentError` from inside action handlers stays exit 1. Spec still says errors go to stderr and no code-2 (stale vs the f4dd3b9 code).

cyberplace.old / universal-plugin / cyberlegion (OLDER): errors structured with stable `code` + message but on STDERR, exit 0/1 only; unknown flag exit 1; cyberlegion `fail(msg)` = `console.error(JSON.stringify({ error: msg }))` + exit 1. `stderr contains "--frobnicate"` for unknown flag in features.

## 4. Home view / content-first / help-for-agents

gherkin-cli bare invocation (home view; old-WSL: gherkin-cli/.agents/specs/gherkin-cli/cli/home/README.md + src/cli.ts):
```
bin: ~/.local/bin/gherkin-cli
description: "Parse, validate, and diff Gherkin .feature files as token-efficient agent output"
count: "1 of 1 total"
features[1]{file,scenarios,tags}:
  feat/login.feature,1,[@smoke]
help[3]: ...
```
Rules: glob `**/*.feature` from cwd excluding `node_modules`, cap `HOME_LIMIT = 20` (cap applies to output not the walk - reviewer flagged slowness in large repos), `bin:` collapses `$HOME` to `~` (shows `src/cli.ts` under tsx, `dist/cli.js` built), `description` one sentence, zero-state explicit, help hints. Before the fix bare invocation printed help to stderr so "an agent saw nothing at all".
cyber-asana home: `bin`, `description: "Asana CLI for AI agents"`, `version`, then user (name/gid/email) then Next steps; rationale "An agent's first invocation is usually a reachability probe, and help text answers a question it did not ask."
cyberlegion bare: `self: -`, `harness`, `unread: 0`, `units: 0`; exit 0 even unregistered, with a register next-step, "never help+error".
cyberplace/universal-plugin (older): bare binary stays a pure dispatcher showing help; GROUPS with no subcommand show live data (`cyberplace awesome` = sources, `cyberplace config` = `config provider list`, `cyberplace tavern`, `governance` = `list`, `plugin` = `validate`). cyber-mux retracted this group-extension as not AXI's text (section 6).
Help for agents: every subcommand `--help` has synopsis + flags + one example (`.addHelpText('after', '\nExample:\n  $ gherkin-cli parse features/login.feature --tag @smoke')`); cyber-asana ends each resource group's --help with worked examples and advertises `--help` by name in root help; spec for cyber-mux wants 2-3 examples, defaults, required args. "--help output quality matters directly — it is the tool description the agent reads" (research, section 10).

## 5. Principle 7: ambient context / session hooks

- gherkin-cli, cyber-mux, universal-plugin, cyberplace(.old): #7 deliberately OUT OF SCOPE ("leaf CLI with no session-context surface"; universal-plugin ADR-0003 says session-hook wiring belongs to the cyberplace package and installable Skill to cyberspace/aced; "most likely a thin setup command that delegates"). Follow-up CRs named `axi-ambient-context` and `impl-axi-contract` were never started in the sources seen.
- cyber-asana is the only implementation (old-WSL: cyber-asana/packages/cyber-asana/src/setup-cli.ts): `cyber-asana setup hook [--settings <path>] [--dry-run]` writes a Claude `SessionStart` hook into `.claude/settings.json` (default) whose command is `cyber-asana --toon` (i.e. the bare content-first view as TOON, so each session starts with live identity context). Idempotent: detects any SessionStart hook whose command contains `cyber-asana`; result `{path, command, already_installed, written}`. Also the plugin manifest declares opt-in MCP server + on-demand skills with `init-asana` as the first-run entry ("install-then-offer ordering").
- cyberplace(new) has `hook run` always-JSON SessionStart payload (ADR-0004 archetype 2) - not AXI but the same ambient idea.

## 6. Rationale from ADRs and decision logs

- gherkin-cli ADR 0001-adopt-axi (2026-07-05, accepted; old-WSL: gherkin-cli/.agents/specs/gherkin-cli/design/decisions/0001-adopt-axi.md): CLI consumed by agents "(parsing suites in a reasoning loop, diffing scenarios in a review flow)"; "A human-prose-first CLI with `--format json` as an afterthought is the inverse of what an agent wants: it spends tokens on prose, dumps every field, and blurs the machine result with human chatter on one stream." Adopts #1-6, #8-10; stream discipline = stdout for everything the agent consumes, stderr only uncaught-exception fallback ("Errors, hints, and empty states were moved off stderr onto stdout because agents read stdout, not stderr"). Consequence: consumers (SDD suite engines) parse stdout as TOON/JSON without stripping chatter and branch on exit codes + stable error `code`.
- universal-plugin ADR-0003 (2026-07-04): "TOON is the default; `--format json` stays" (nothing narrowed away; json escape preserved); stream split stdout=result+aggregate, stderr=next-step/warnings/errors "keeps `--format json | jq` and TOON parsing clean" (LATER SUPERSEDED by gherkin-cli/cyber-mux); `plugin init` becomes non-interactive by default, `--yes` degrades to a compat no-op; content-first satisfied at group level without new commands; reopened approved spec -> draft to rewrite frozen features.
- cyberplace.old axi node: same contract, shared "so an agent moving between the two bins sees one interface"; `add/remove/update` must run to a deterministic default instead of the TTY select (no prompts); "`--format agent|json|text` collapses toward TOON default + the `json` escape".
- cyber-mux decisions log (old-WSL: cyber-mux/packages/cyber-mux/.agents/spec/design/decisions/README.md, `36-axi-error-surface` grill): errors move to stdout ("Requester chose to follow AXI here rather than fork"; accepted cost: cross-bin stream mismatch until cyberplace follows); bare `send` = #6 usage error, exit 2 (earlier "#8 amendment" reasoning explicitly retracted); `exists` keeps 1 = gone as a documented divergence; layout validate-name conflict resolved by reclassifying only malformed-name / mutually-exclusive-flag / missing-required-param to 2 (4 scenarios), everything else stays 1 ("a `validate` reporting a template's content invalid is a predicate answer", mutating verb refusing is operation failure). Footnote: ONE `fail()` helper with 22 call sites carried stream+code+structure so one pass beat three.
- Field-selection rule (cyber-mux #2): "A field earns its slot by discriminating, not by being known." `list` dropped the `mux` column because every row carried the same value; kept `pane, label, harness, cwd`; `doctor` -> `mux, via, pane, backend`.
- cyber-asana: shared contract stated once so twelve resource domains do not each invent an answer; "AXI is the tiebreaker" between sibling bins; Asana API verbosity motivates default `opt_fields` (only tasks applied: `TASK_LIST_FIELDS`; the spec records partial adoption of #2 as a "real finding, not a simplification"). MCP defaults JSON deliberately (not to break established contract) with TOON via env `CYBER_ASANA_MCP_FORMAT=toon`, applied centrally at registration (`withMcpOutputFormat`). CLI default is TEXT, TOON opt-in `--toon`, JSON `--json` (a divergence from #1 recorded in the spec).
- Pagination contract (cyber-asana): bare array when no pagination input; envelope `{data, next_page, limit, ...}` once any of `limit/offset/fetchAll` given; `fetchAll` bounded (`maxPages` default 10, page 100), reports `page_count` and `truncated: true` ("A bounded walk that admits it was cut is the honest shape").
- suite-token-opt design (old-WSL: cyberplace.old/.agents/plans/suite-token-opt.design.md): AXI CLI as consumed contract: SDD engines shell `npx gherkin-cli@<pin> parse|diff ... --format json`; `parse` TOON manifest replaces raw `.feature` in LLM context, `diff` `addOnly: true` lets purely additive changes self-clear with no judge round. Design intent: pinned npx, version via `build-resolve-pins`. This is the main consumer-side evidence that `--format json` + stable summary fields (`addOnly`) are load-bearing.

## 7. Conformance plans and what was checked / failed

- axi-conformance plan (universal-plugin; old-WSL: cyberplace.old/.agents/plans/axi-conformance.plan.md + .log.jsonl, ledger packages/universal-plugin/.agents/spec/ledger/axi-conformance.04835d.jsonl, 2026-07-04): all todos completed; spec-only by user decision (impl deferred, banners "impl trails the contract", commits cebb510, b20e69c). Cold spec-judge 3-lens (oracle/builder/architect): round 1 FAIL on two coverage gaps - "managed scope never positively exercised" and "#6 no-prompts claimed but untested on build/validate/governance" -> added managed-wins scenario + uniform non-interactive scenarios; round 2 ALIGNED. Frozen features rewritten to assert: TOON default, aggregates, empty state, truncation, next-step, content-first, no prompts, unknown flag, `--help`. Follow-up CRs filed: impl-axi-contract; axi-ambient-context (#7).
- cyberplace-marketplace-axi plan (old-WSL: cyberplace.old/.agents/plans/cyberplace-marketplace-axi.plan.md; ledger c5e6e5): two-round judge; Builder caught 5 coverage gaps in round 1 ("stale stub line, list --global, config-provider errors, update/migrate not-found, inspect error"). Impl gate WITHHELD; advisory: registry node 52 scenarios (>40, two-level depth cap blocked in-node split). Deferred: TOON default in `src/output.ts`, aggregates, next-step on stderr (now stale), truncation + `--full`, non-interactive `registry` (replace TTY prompts in `src/registry/prompt.ts`).
- Checklist items asserted by feature files (literal assertions): TOON rows carry named columns (`"repo","summary","install"`; `"name","scope","source"`; `"name","type","match"`; `"name","layer","enabled"`; build `vendor, path, status`); aggregate strings above; `0 ...` empties exit 0; truncation `matching "… +\d+ lines — rerun with --full"` with 60-item (awesome) / 200-row (registry find) fixtures; `--full` lists all 60/200; `--format json` is a JSON array with all entries; a small doc is never truncated; no interactive prompts (add with bare repo, remove with no name, update with no name/scope); unknown flag `--frobnicate` named in error; `--help` shows "a synopsis, the flags, and one example" per subcommand; next-step `stderr ends with "→ cyberplace list"` etc.
- api-cli-split / gherkin-cli plan (old-WSL: gherkin-cli/.agents/plans/api-cli-split.log.jsonl, 2026-07-22): spec-judge CHANGE verdict: "missing diff-rename coverage, stale AXI #8 wording in axi/README + ADR, stale stderr stream-discipline in ADR" -> fixed. impl-judge CHANGE: "13 frozen scenarios behaved correctly but lacked a test pinning their Then-clause" -> 13 behavior-pinning tests added, suite 49 -> 85. CLI usage suite (`cli/usage/usage.feature`, @frozen) scenarios: unknown flag -> EBADFLAG on stdout naming valid flags + exit 2; result/errors/hints/empty-states all stdout; stderr empty on normal or structured-error run; JSON never truncated; large TOON truncated with hint; `--full` disables.
- cyber-mux 36-axi-error-surface (ledger e9e767): 3 judge rounds; R1/R2 failed all lenses, R3 passed; 559 tests; Clearance re-opens of mux.feature (6 stream scenarios) and layout.feature; impl gate re-derived each scenario's oracle and drove the real binary. 40-layout-suggestions-on-stdout: `template save` stdout changed from bare path to structured `{path, help[]}` (breaking: `$(cyber-mux template save x)` -> `--format json | jq -r .path`, "structured by default", ratified with composition-change preview).
- cyber-mux still trailing (per its own spec): TOON default (#1), `--fields` (#2), truncation hint (#3 only done for `read`), aggregates (#4), home view + tool identity (#8/#10); bare `worktree` prints help exit 1 (left on scope).
- cyber-asana rollout (old-WSL: cyber-asana git f4dd3b9, #110; spec axi/README.md): audit found 15 mutation acknowledgements ignored `--json/--toon` (printed prose regardless of format); `Next offset:` helper not gated to text mode (no actual leak, helper ungated unlike siblings); default `optFields`, count summaries, entity-named empty state at all 17 sites, self-correcting unknown-flag errors exit 2, idempotent deletes, `bin:`/`description:`/`version` on home view, SessionStart hook setup. Deferred: per-leaf-subcommand `Examples:` (~70 leaves; only 13 group-level example blocks), story list text column truncation, MCP delete 404.

## 8. Lessons recorded (ledgers, PRs, changelogs)

1. Errors/hints/empty states on stderr are INVISIBLE to agents: "An agent that ran `gherkin-cli parse missing.feature` saw empty stdout and exit 1 — no reason, no recovery path. The contextual-disclosure hints existed but were invisible, so the whole feature was dead weight." (gherkin-cli PR #12 body, commit 283bd6f, 2026-07-18; CHANGELOG 0.1.0). Same finding in cyber-mux #36 (2026-07). Verified by `2>/dev/null` runs showing stdout carries everything.
2. Hints must not scale with input: collapse file lists to `<files...>` (PR #14).
3. Reading the local restatement instead of upstream AXI repeatedly produced drift: cyber-mux #31 "read the dropped exit 2 as the code's non-existence and invented a meaning for it", #37 corrected; its node "dropped `2`", "dropped the home-view identity half of #10", "extended #8 to command groups", "demanded a next-step from every command (contradicting omit-when-self-contained)", and "stated stderr for errors". Lesson: restate the source verbatim, label local extensions as extensions; AXI is the tiebreaker among sibling bins.
4. Truncation should be a text-rendering concern, never alter machine payloads (cyber-asana; gherkin-cli never truncates JSON).
5. A flag meaning two things (`--full`) is a breaking-change risk later (gherkin-cli).
6. `diff` hash must include step arguments (DocString/DataTable): a frozen `@rubric` threshold could change 3 -> 0 with `addOnly: true` (gherkin-cli 0.0.2, ledger a329341). Relevant to any summary field agents trust for decisions.
7. cyber-mux #2 discriminating-columns rule; also mux `list` herdr bug: panes with no agent were silently dropped, contradicting "enumerate every live pane" contract (76ee25b).
8. Backend text leakage: `Exec` discarded stderr then forwarded raw (`tmux split-window failed`) - fix was to capture reason `lastError` and translate (96dbe39, 5de47c3).
9. Impl-trails-contract pattern: specs adopt AXI first, impl gated later; always label "contract, not a report of what ships".
10. Sibling cross-bin drift (accepted cost): until cyberplace/universal-plugin were fixed, errors were on different streams. cyber-mux ledger seq 2 filed "cyberplace's axi node inverts AXI on streams, word for word" - no evidence in the old WSL that it was fixed.
11. Home view perf note: glob on every bare run (cap is on output, not the walk).

## 9. Disagreements between sources (newer wins)

| Topic | Older | Newer (use this) |
|---|---|---|
| Error/hint/warning stream | cyberplace.old axi, universal-plugin axi + ADR-0003 (2026-07-04): next-step line, warnings, errors on STDERR | gherkin-cli (2026-07-18+, CHANGELOG 0.1.0, ADR 0001 2026-07-05 text updated 2026-07-22) and cyber-mux #36: ALL agent-consumed output on STDOUT, stderr = non-load-bearing diagnostics only. cyber-mux's node claims cyberplace "has not followed" |
| Stale in gherkin-cli itself | `AGENTS.md` ("stderr carries ... next-step line, warnings, and structured errors", "Unknown flags fail loud (exit 1)") and `.agents/plans/gherkin-cli.design.md` ("`→ gherkin-cli …` on stderr", bare = help) | spec `axi/README.md`, `cli/usage`, code: stdout, exit 2, `help[n]` |
| Unknown flag exit | 1 (cyberplace/universal-plugin/cyberlegion/AGENTS.md; cyber-asana spec "no code 2") | 2 (gherkin-cli, cyber-mux, cyber-asana code f4dd3b9) |
| Exit code set | 0/1 only (cyberplace.old, universal-plugin) | 0/1/2 (AXI's own three; cyber-mux restated "in full"); cyber-asana adds 3/4/5/6 for auth/forbidden/not-found/rate-limit (domain extension) |
| Next-step syntax | `→ cmd` on stderr (cyberplace.old family) | `help[N]:` block in stdout payload (gherkin-cli quoted lines; cyber-mux `help[i]: msg` + `  -> cmd` with `{message, command}`); the two newer syntaxes themselves differ - pick one for the shared package |
| Next-step in every command | cyberplace/universal-plugin/old cyber-mux "every command ends with a next-step line" | omit when self-contained (AXI text per cyber-mux) - but gherkin-cli still emits on every command, including empty-state ones |
| Content-first scope | group-with-no-subcommand shows live data (cyberplace.old, universal-plugin) | AXI scopes #8 to the bare binary only; group extension is "this node's extension, not AXI's text", open (cyber-mux) |
| Default format | TOON default (cyberplace.old, universal-plugin, gherkin-cli, cyber-mux contract) | cyber-asana: text default, `--toon` opt-in, MCP JSON default (recorded divergence). cyber-mux impl itself is still text/json |
| Aggregates | always inside structured payload (gherkin-cli `summary`, cyberplace specs) | cyber-asana text-mode only |
| `parse` vs `validate` exit on syntax errors | n/a | inconsistent in gherkin-cli, undecided |
| `--format` values | `agent` (cyberplace(new) governance, ADR-0004), `text` | `toon | json` (gherkin-cli); cyber-mux reserves `agent` unused, `isAutomatedOutput()` true for `json` or `agent` |
| `exists` predicate | exit 1 = gone (cyber-mux) | deliberate AXI divergence; open whether to make `gone` exit 0 as a definitive empty state |
| TOON quoting | `"` doubled (cyberlegion, CSV) | backslash-escaped `\"` (gherkin-cli); JSON.stringify (cyber-asana) |

## 10. Pre-AXI research and doctrine (context, not AXI)

- old-WSL: cyberplace/.research/cli-output-format/conclusion.md (May 2026): findings: JSON mode can degrade reasoning 10-15% (Tam et al. 2024); `{"sentiment":"positive"}` ~40% more tokens than prose; Markdown cuts tokens up to 80% vs HTML; "Verbosity is the #1 real-world failure mode" (paginate or summarize); STDIO transport rule: stray stdout corrupts JSON-RPC, logs to stderr; "A well-designed CLI invoked via bash can be 10-32x cheaper on context than MCP" (Pulumi 2026, MCP tool definitions persist in the system prompt) and `--help` quality is the tool description; layered consensus: Markdown/plain text for agent reasoning, flat JSON (max 3-4 fields, no `$ref`/`oneOf`, text fallback) for machines, TOON or TSV for high-volume. Format matrix: Agent reads -> text/markdown; non-LLM -> flat JSON; both -> JSON with TextContent fallback; high-volume -> TOON/TSV; large -> paginate/summarize. Flag naming options weighed: `--format json|text`, `--machine`, `--porcelain`, `--structured`; chose `--format json` (+ hidden `--json` alias).
- old-WSL: cyberplace/artifacts/adr/0004-cyberplace-cli-output.md + packages/cyberplace/governances/agent-tool-output.md: pre-AXI three archetypes (dual-audience `--format agent|json` with human-prose default; always-JSON hook runtime via `process.stdout.write(JSON.stringify(result)+'\n')`; markdown-on-stdout). Rules: stdout = machine contract, stderr = human/diagnostic, `--verbose` gates human output, `--yes` for autonomous runs, exit 0 / non-zero + concise stderr error, no prose/ANSI on stdout, files hold durable state (stdout names paths). This CONTRADICTS the later AXI-on-stdout stance (errors on stderr, human-prose default); it is the older doctrine and AXI supersedes it where the same CLI is concerned. `isAutomatedOutput()` (true for agent|json) used to suppress prompts.
- Other `.research` sweeps (`grep -rliwE 'axi|toon'` over ~/code/*/*/.research, agent-changesets, unisonventures/trading): only cyberplace/cli-output-format, cyber-sdd/strain-kind-discriminator/evidence.md (incidental: governance criteria "every command supports `--json`; adds `--toon`" as an example of inherited-criteria misplacement), cyberlegion + cyberplace `agent-session-wake` and cynapse `agent-messaging-architecture` (mention TOON/token cost only incidentally; not read in depth). No `.research` folder on AXI itself exists; ledgers in cyber-sdd contain no AXI-specific entries (strategy/legacy shards matched only by word, not about CLI output). No axi/toon content in agent-changesets or trading `.research`.

## 11. Key paths (all old-WSL, relative to ~/code/cyberuni)

- gherkin-cli/.agents/specs/gherkin-cli/axi/README.md; design/decisions/0001-adopt-axi.md; cli/{usage,home,parse,validate,diff}/{README.md,*.feature}; packages/gherkin-cli/src/{output.ts,cli.ts,cli.test.ts}; apps/website/src/content/docs/concepts/{axi,toon}.md; .agents/plans/{gherkin-cli.design.md,api-cli-split.log.jsonl}; packages/gherkin-cli/CHANGELOG.md; git 283bd6f, b5d9c92, 37abb4c.
- cyber-mux/packages/cyber-mux/.agents/spec/axi.md; design/decisions/README.md; ledger/36-axi-error-surface.e9e767.jsonl, 40-layout-suggestions-on-stdout.1e0db2.jsonl; src/{output.ts,cli-error.ts,cli.ts}; CHANGELOG.md (9d027b3, c456ef9, 5de47c3); cyber-mux/docs/design/worktree-disposability.md; .agents/plans/per-adapter-conformance-runner.plan.md ("Exit codes follow AXI's set: `0` success, `1` error/gap, `2` usage").
- cyber-asana/packages/cyber-asana/.agents/spec/axi/README.md; src/{output.ts,toon.ts,truncate.ts,cli-usage.ts,default-command.ts,setup-cli.ts,idempotent-delete.ts}; git f4dd3b9. (Present in old distro only as the main repo and worktree legion-078b53.)
- cyberplace.old/.agents/specs/cyberplace/axi/README.md; marketplace/{awesome-list,registry,tavern}/*.feature; ledger/{cyberplace-marketplace-axi.c5e6e5,tavern-plugin-storefront.a75a36}.jsonl; .agents/plans/{axi-conformance,cyberplace-marketplace-axi,suite-token-opt.design}*; packages/universal-plugin/.agents/spec/{axi/README.md,design/decisions/0003-adopt-axi.md,ledger/axi-conformance.04835d.jsonl,plugin/*/*.feature,governance/governance.feature}; packages/cyberlegion/src/{output.ts,cli.ts}.
