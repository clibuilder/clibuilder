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
