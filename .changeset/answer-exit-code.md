---
'clibuilder': minor
---

`result()` and `document()` take an `exitCode` (#754).

A command can now return an answer that is also a failure, such as a check that finds the thing gone or a wait that timed out, without setting `process.exitCode` itself:

```ts
return result({ exists }, { exitCode: exists ? exitCodes.success : exitCodes.error })
```

The answer is printed as a result, not as an error, and the cli exits with `exitCode` (an integer from 0 to 255, 0 by default) in both output modes. `parse()` still resolves to the value, and `runScript()` resolves to `exitCode`.
