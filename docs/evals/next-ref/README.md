# Eval: does `next[N]{run,why}` beat `help[N]` strings?

Gate for #696 (from #688 item 5). The ACED harness (`aced:run`) is not installed here, so this is a direct harness: `claude -p` against a fixture CLI.

## Setup

- Fixture: `ops.mjs`, a small CLI with `status`, `logs`, `releases list`, `releases revert <service> --release <id> --confirm` and `restart`. `ops --help` lists every command and is identical in all variants.
- Task: "Use the `ops` CLI to find which service is unhealthy and fix it. Stop when the service is healthy again." The fix needs a second call whose syntax is only in `--help` or in the first output's hint (`status` then `releases revert api --release r-41 --confirm`).
- Variants, differing only in the output of `ops status`:
  - `prose`: one sentence, no hint.
  - `help`: TOON plus a prose `help[1]` line ("use the releases revert command to roll back a failed release to the last good one").
  - `next`: TOON plus `next[1]{run,why}` holding the exact runnable line and a reason.
- Only the Bash tool was allowed. Runs used `claude` 2.1.296 with `--setting-sources ""`, `--max-turns 15`.
- Wrong call: any `ops` invocation that exits non-zero. Calls are logged by the fixture. Turns come from `num_turns` in the JSON output.
- Run it: `./run.sh <model> <variant> <n>`, then `node an.mjs` (reads `runs/`, not committed).

## Results

| model | variant | runs | fixed | calls | wrong calls | turns |
| --- | --- | --- | --- | --- | --- | --- |
| haiku-5-5 | prose | 12 | 12 | 12.50 | 1.08 | 6.67 |
| haiku-5-5 | help | 12 | 12 | 11.58 | 0.92 | 7.25 |
| haiku-5-5 | next | 12 | 12 | 11.92 | 0.92 | 7.08 |
| sonnet-5-5 | prose | 6 | 6 | 7.33 | 0.00 | 4.67 |
| sonnet-5-5 | help | 6 | 6 | 9.17 | 0.50 | 6.00 |
| sonnet-5-5 | next | 6 | 6 | 7.33 | 0.33 | 5.17 |

Means per run. One extra haiku `next` run (index 0) was a smoke test and is excluded.

## Reading

- Every run, in every variant, fixed the service. `next` did not reduce wrong calls or turns against `help` on haiku (0.92 vs 0.92 wrong; 7.08 vs 7.25 turns). On sonnet the n is 6 per cell and the differences (0.33 vs 0.50 wrong) are within noise; `prose` was the best cell there.
- Weakness of the fixture: every run called `ops --help` first, which lists the revert syntax, so the first-output hint was rarely needed. The eval shows `next` is not needed when `--help` is cheap and complete. It does not test a CLI whose help is large or absent.
- Not run: ACED scoring and a larger n. The calls average about 11 per run because the models re-check status and read logs after fixing; that is the same across variants.
- What this decides: the default stays plain `help` strings, because `next` did not beat them in the simple case. It does not decline `ref()` or `next`; they stay open as an opt-in author feature, designed in [`docs/rfcs/next-step-refs.md`](../../rfcs/next-step-refs.md).

## Q3: a CLI with a large or absent `--help`

Open question 3 of [`next-step-refs`](../../rfcs/next-step-refs.md#8-open-questions) asked for a rerun against a CLI whose `--help` does not cheaply give the answer. This repo has no such example, so this run adds one.

### Setup

- Fixture: `svc.mjs`, a platform CLI in the shape of `gh` or `kubectl`: 24 command groups of 8 verbs each, plus `status`, `logs`, `deploy history`, `deploy rollback` and `deploy promote`. The fix is `svc deploy rollback api --to r-41 --ack`.
- Help modes, set by `SVC_HELP`:
  - `large`: `svc --help` prints all 255 lines. The rollback line, with its flags, is one of them.
  - `absent`: every `--help`, `-h`, `help` or bare `svc` call fails with `no help is available`. Usage errors still name the missing piece (`missing required option --to <release>`, then `missing required option --ack`), as clibuilder's ranked usage errors do (#706).
- Variants, set by `SVC_VARIANT`, differ only in the output of `svc status`. Both print the same TOON table and a `failed:` line.
  - `help`: `help[1]: use the deploy rollback command to roll api back to its last good release`. This names the command but not its flags, which is how a prose hint is usually written.
  - `next`: `next[1]{run,why}` with the exact line `svc deploy rollback api --to r-41 --ack`.
- `status` reports `api` healthy only after a successful rollback. The global flags `--env`, `--format` and `--quiet` are accepted.
- Task, tools and limits are the same as the first eval. Runs used `claude` 2.1.299. The prose variant was not rerun.
- Run it: `./run-q3.sh <model> <large|absent> <help|next> <n>`, then `node an-q3.mjs`. Set `RUNS` to keep the runs outside the repo.

### Results

| model | help | variant | runs | fixed | calls | wrong calls | help calls | turns | input ktok | cost USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| haiku-5-5 | absent | help | 12 | 12 | 11.33 | 6.83 | 3.42 | 6.42 | 110.1 | 0.0036 |
| haiku-5-5 | absent | next | 12 | 12 | 6.67 | 3.17 | 1.92 | 4.17 | 70.1 | 0.0029 |
| haiku-5-5 | large | help | 12 | 12 | 5.92 | 0.67 | 1.25 | 4.08 | 82.7 | 0.0038 |
| haiku-5-5 | large | next | 12 | 12 | 5.08 | 0.17 | 1.00 | 3.83 | 78.0 | 0.0038 |
| sonnet-5-5 | absent | help | 6 | 6 | 8.17 | 3.17 | 1.17 | 5.17 | 81.7 | 0.0453 |
| sonnet-5-5 | absent | next | 6 | 6 | 4.00 | 1.00 | 1.00 | 3.00 | 47.1 | 0.0379 |
| sonnet-5-5 | large | help | 6 | 6 | 4.67 | 0.00 | 1.00 | 3.33 | 64.1 | 0.0602 |
| sonnet-5-5 | large | next | 6 | 6 | 4.33 | 0.00 | 1.00 | 3.17 | 59.4 | 0.0599 |

Means per run. In `absent` mode every help call fails, so it counts as a wrong call. Input ktok is input plus cache tokens, in thousands.

Failed rollback calls per run:

| model | large, help | large, next | absent, help | absent, next |
| --- | --- | --- | --- | --- |
| haiku-5-5 | 0 | 0 | 2.16 | 0 |
| sonnet-5-5 | 0 | 0 | 2.00 | 0 |

A first batch of 72 runs was discarded because of two fixture bugs. `status` turned healthy after a failed rollback, so runs stopped after a failed call. The documented global `--env` flag was rejected. Both are fixed in the committed `svc.mjs`.

### Reading

- **Absent help: `next` helps.** With `help[1]`, every run guessed the flags from usage errors: about two failed rollbacks per run, then success. With `next`, no run failed a rollback; each ran the given line first time. Turns fell from 6.42 to 4.17 on haiku and from 5.17 to 3.00 on sonnet. The remaining wrong calls in `next` runs are probes made before `status` (`--help`, `list`, `status api`).
- **Large help: no difference that matters.** Every run read the 255-line help once, found the rollback line, and ran it correctly first time in both variants. The wrong calls are probes such as `svc list`. A large but complete `--help` behaves like the short one in the first eval.
- **Every run fixed the service.** The absent-help runs recovered only because the usage errors name the missing option. A CLI with absent help and bare errors (`unrecognized command`) would widen the gap; this run does not measure that.

What this decides: `next[N]{run,why}` reduces failed calls and turns when the CLI's own help cannot supply the exact call, and adds nothing when `--help` is complete, even at 255 lines. It supports keeping `next` as an author opt-in for CLIs whose help is absent, partial, or not where the agent looks, such as skill scripts.

What it does not decide:

- Whether `next` becomes the default. The gain appears only when help is missing, and a `help` string that carries the full backticked command, as `ref()` renders by default, was not tested. That string may close the same gap without a new key.
- The open questions 1 and 2 in the RFC. They stay with the Council.
- Confirmation flags. `next` hands the agent `--ack` with the rest of the line. No run hesitated over it, in either variant. Whether a CLI should put a confirmation flag in a `next` line is a design question for the author; this eval does not test it.
- Larger n and ACED scoring. n is 12 per haiku cell and 6 per sonnet cell, one fixture, one task.
