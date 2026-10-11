---
'@clibuilder/axi': patch
---

`output.result()` returns the value marked as already written when the installed `clibuilder` has the result channel, so a CLI with `cli({ output: 'axi' })`, which prints what `run()` returns, prints the result once. `parse()` still resolves to the value, and `result()` still writes it itself, so `console` output and a custom writer are unchanged. With an older `clibuilder` it returns the value itself, as before. The return type is now `OutputResult<T>`.
