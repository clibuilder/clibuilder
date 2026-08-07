---
"clibuilder": patch
---

Update `search-packages` to `^2.2.0`.

It replaces its `npm search` shell-out with a direct `fetch()` against the registry, so `plugins search` no longer requires `npm` on `PATH` — it now works for standalone CLI installs and under bun/deno — and drops the process-spawn cost from the command. The API `clibuilder` uses is unchanged.
