# AXI findings

What was learned building agent-facing (AXI) CLI output by hand, before
`@clibuilder/axi` existed, and what the package took from it. Collected
2026-10-05 from the `cyberuni` and `repobuddy` repos (current checkouts, an
older WSL instance, and GitHub issues and PRs), the user's own research, and
upstream [kunchenguid/axi](https://github.com/kunchenguid/axi) (principles,
`SKILL.md`, and `axi-sdk-js` 0.1.13).

The per-source catalogues next to this file hold the detail and the citations:

| File | Covers |
| --- | --- |
| [research.md](research.md) | Upstream AXI and `axi-sdk-js`; `unional.github.io/.research/axi-agent-consumption-effectiveness` (token measurements and proposed amendments); `cyberplace/.research/cli-output-format` |
| [cyber-mux.md](cyber-mux.md) | cyber-mux: error surface, `help[N]` hints, read truncation, parser migration to clibuilder |
| [cyberplace-sdd-harness.md](cyberplace-sdd-harness.md) | cyberplace, cyber-sdd, agent-harness (where this package's first API came from) |
| [legion-asana-others.md](legion-asana-others.md) | cyberlegion, cyber-asana, universal-plugin, cynapse, cyber-truss, cyberfleet |
| [old-wsl.md](old-wsl.md) | gherkin-cli, cyberplace.old, conformance plans and ledgers on the older WSL instance |
| [github.md](github.md) | Issues and PRs across both orgs; cyber-figma, cyber-slack, buddy-agent-harness |

## Conventions, and which form won

Where the repos disagree, the newest form that was reached by fixing a real
failure wins, and upstream AXI breaks ties.

| Concern | Converged form | Superseded forms | Why |
| --- | --- | --- | --- |
| Encoding | TOON by default, `--format json` to pipe, `text` for people | `--toon`/`--json` booleans with a text default (cyber-asana, cyber-figma); `--format agent` (cyberplace ADR-0004) | Upstream principle 1; TOON is 26–38% cheaper than compact JSON on lists (EFF measurement) |
| TOON encoder | `@toon-format/toon` | Hand-rolled encoders that escape differently or not at all (cyberlegion `toonObject`, cyber-sdd `""` quoting, cyberplace) | Three repos, three quoting bugs |
| Stream | Everything the agent acts on — result, error, hints, empty state — on **stdout**; stderr is diagnostics only | Errors and hints on stderr (universal-plugin ADR-0003, cyberplace, cyberlegion, buddy-agent-harness) | An agent saw empty stdout and exit 1 and could not recover (gherkin-cli #12, cyber-mux #36, cynapse #40) |
| Next steps | `help[N]:` lines inside the result; omitted when the output is self-contained | `→ cmd` on stderr (cyberlegion, universal-plugin, cyberplace); "Next steps:" text-only lists (cyber-asana); a hint owed by every command (cyber-mux before #41) | Upstream principle 9; one shape across formats; cyber-mux #41 |
| Error shape | `error`, `code`, details, `help` — flat, same keys in every format | `{"error":{...}}` nested (cyber-mux JSON, cynapse); `{ok:false,error:{kind,...}}` (cyber-asana); bare `error: msg` on stderr | Upstream SDK `errorOutput`; one shape reads the same in TOON and JSON |
| Error code | A stable kebab-case string that tells failures apart | `VALIDATION_ERROR`/`UNKNOWN` (upstream SDK); `EBADFLAG` (gherkin-cli) | cyber-mux and cynapse codes; codes must discriminate |
| Exit codes | 0 success including no-ops, 1 failed, 2 called wrong | 0/1 only (older specs); 3–7 for auth/forbidden/not-found/rate-limit (cyber-asana, cyber-figma) | Upstream principle 6; already `clibuilder`'s `exitCodes` |
| Usage errors | Exit 2, structured on stdout, naming the valid flags of that subcommand; an unknown flag outranks the errors it causes | Commander's text on stderr; exit 1 for an unknown flag (cyberplace tavern) | Upstream principle 6 (#63); cyber-mux #194 ranking; cyber-asana `installUsageErrors` |
| Truncation | Cut long text with its size, `... (truncated, N chars total)`, and a `--full` escape; JSON is never truncated | `… +N lines — rerun with --full`; an opt-in `--truncation` flag (cyber-mux before #104); `--full` meaning two things (gherkin-cli) | Upstream principle 3 |
| Counts | `count: 30 of 847 total` in the payload; the TOON `[N]` header counts the rows shown | Aggregates printed in text mode only (cyber-asana, cyber-figma); `crews[N]` showing truncated rows next to a total (cyberplace tavern) | Upstream principle 4; a header that disagrees with the rows defeats its purpose |
| Empty state | A sentence that says the zero: `tasks: 0 open tasks found` | `(none)`; blank output; `name[0]:` alone | Upstream principle 5 |
| Home view | Bare binary prints `bin: ~/...`, `description`, then live content | Bare command groups run their list (retracted in cyber-mux) | Upstream principles 8 and 10 |
| Agent detection | None: the format is always explicit | TTY branching (rejected in universal-plugin ADR-0005) | No adopter detects agents; a flag is reproducible |

## Lessons

- **Restating AXI drifts.** cyber-mux's local copy of the principles dropped
  exit 2, put errors on stderr and widened content-first to command groups; the
  copy, not upstream, was then treated as the contract. A shared package is the
  fix this package exists to be.
- **One renderer makes a convention change one pass.** cyber-mux moved errors
  to stdout in a single PR because every error went through `reportError`.
- **Specs went stale against code in both directions.** cyber-asana's spec
  denied an exit code its code used; universal-plugin's spec claimed TOON while
  the code printed padded tables for weeks.
- **Never forward a dependency's text.** Translate it into the CLI's own code
  and help; raw text may go to stderr as a diagnostic (cyber-mux #49).
- **Help blocks can cost more than the answer.** A 26-file batch run produced a
  6.2KB help block (gherkin-cli #14); use placeholders such as `<files...>`.
- **Test the built binary.** cyberlegion's e2e suite asserts stdout, stderr and
  the exit code separately; in-process tests cannot see the exit code.
- **TOON is about cost, not accuracy.** Accuracy ties with JSON (72.2% vs
  71.4%); TOON costs more than plain `key: value` on a single object (+12%) and
  on an error (+20%). See the open questions.

## Gap analysis against `@clibuilder/axi` 0.1.0

| Gap | Status |
| --- | --- |
| No structured error shape; `CliError` text goes to stderr | Added `ErrorReport`, `errorOutput`, `encodeError`, `writeError`, `output.error()` |
| Usage errors print clibuilder's prose and full help on stderr | Added `createUsageErrorHandler()` and `describeUsageError()` for `onUsageError` |
| No next-step hints | Added `help` on `output.result()`, plus `withHelp` and `helpLines` |
| No truncation or `--full` | Added `fullOption`, `truncateText`, `truncateList` |
| No counts | `truncateList` returns `count: N of M total` |
| Empty lists render as `[0]` or `(none)` | Added `orEmpty` |
| No home header; home-collapsing re-implemented in four repos | Added `homeHeader` and `collapseHome`, and dropped the spec's non-goal on collapsing the home directory |
| README example returned `exitCodes.error` for an empty list — wrong on both counts: an empty answer is success, and a returned number does not set the exit code | Fixed |
| `clibuilder`'s internal `formatOption` lists `toon, text, json`; this package lists `toon, json, text` | Left: clibuilder's copy is internal to its built-in plugin commands |

## Open questions

1. **Error echo on stderr.** `throw output.error(...)` writes the error on
   stdout, then clibuilder logs the thrown `CliError`'s message on stderr. That
   is a harmless diagnostic, but an agent that reads both streams sees the
   message twice. Removing it needs `clibuilder` to accept an already-reported
   `CliError`.
2. **`--format` in usage errors.** clibuilder reports usage errors before the
   options are parsed, so `createUsageErrorHandler` writes in the format it is
   built with (`toon` by default) rather than the one on the command line.
3. **TOON for single objects and errors.** The EFF research proposes TOON for
   collections only and plain `key: value` elsewhere; the encoder quotes some
   values (`error: "--title is required"`). Upstream has not adopted it.
4. **Exit codes above 2.** cyber-asana and cyber-figma use 3–7 for auth,
   forbidden, not found and rate limiting, and cynapse uses 3–5 differently.
   The package only names 0/1/2 and accepts any `exitCode`.
5. **Not built:** `--fields` (no source specifies its syntax), session hooks
   (principle 7), a schema manifest (EFF amendment 2), typed `next[N]{rel,cmd}`
   hints (EFF amendment 3), per-subcommand usage examples in help, a version
   fast path, and EPIPE handling (upstream SDK 0.1.12).
