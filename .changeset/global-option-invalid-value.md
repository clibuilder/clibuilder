---
"clibuilder": patch
---

Report a malformed value on a global option given to a sub-command (e.g. `cli sub --verbose=notabool`) as a usage error, as the root command does, instead of silently running the sub-command (#614).
