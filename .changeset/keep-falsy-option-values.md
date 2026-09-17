---
"clibuilder": patch
---

Keep a passed `0`, `false`, or `''` instead of replacing it with the option's `default` (#620).

A default now applies only when the option was not passed, so `--timeout 0`, `--verbose false`, and `--label=` reach `run()` as given.
