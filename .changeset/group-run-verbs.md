---
"clibuilder": minor
---

Under `output: 'axi'`, a command group whose `run()` answers with `result()` or `empty()` now adds its own verbs to the answer's `help`, such as ``valid commands for `app tasks`: add, rm``, so an author no longer adds them by hand (AXI change 2). An answer whose value already has a `commands` key, and a plain returned value, are unchanged. `output: 'console'` is unchanged.
