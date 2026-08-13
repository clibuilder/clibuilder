---
"clibuilder": patch
---

Reject an option value the option's `type` does not accept.

A value that failed the option's schema used to be dropped and replaced by the option's
`default`, so `--format yaml` quietly rendered `toon` and the caller had no way to tell.
It is now reported as a usage error and the cli exits with `2`, the same as an unknown
option. An enum lists what it would have accepted, so the invocation can be fixed in one
step:

```
error: invalid value for option --format: expected one of: toon, text, json, received "yaml"
```

This applies to every option whose `type` clibuilder does not convert itself — `z.enum`
above all. Booleans and numbers already reported their own conversion errors and are
unchanged.
