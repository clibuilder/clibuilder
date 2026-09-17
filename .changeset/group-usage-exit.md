---
"clibuilder": minor
---

A command group invoked without a sub command now exits with `exitCodes.usage` (2).

A command that has `commands` but no `run` — and a cli with sub commands but no `default()` — still prints its help, but no longer exits `0`: a caller must add a sub command, so a bare call is a usage error. Asking for help explicitly (`my-cli send --help`) still exits `0`.
