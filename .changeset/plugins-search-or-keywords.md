---
"clibuilder": minor
---

Match `plugins search` keywords disjunctively, and add `--format` to its output.

A cli declaring several keywords used to find only packages carrying *all* of them, so
a plugin tagged with one of the cli's keywords was never listed. Each keyword is now
searched on its own and the results are unioned, deduped, in keyword order.

`plugins search --format <toon|text|json>` picks how that result is rendered. The default
is `toon`, following the Agent eXperience Interface — a cli's plugin search is read by an
agent far more often than by a person, and toon is the cheaper read for one:

```
packages[2]: pkg-x,pkg-y
help[1]: Run `plugins list` to see which of them are installed
```

`--format text` is the previous human-readable prose, unchanged. `--format json` emits
`{ "packages": [...] }` alone, with no help line, so it survives a pipe into `jq`.
