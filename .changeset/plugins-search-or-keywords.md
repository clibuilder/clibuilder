---
"clibuilder": minor
---

Match `plugins search` keywords disjunctively, and print its results in TOON.

A cli declaring several keywords used to find only packages carrying *all* of them, so
a plugin tagged with one of the cli's keywords was never listed. Each keyword is now
searched on its own and the results are unioned, deduped, in keyword order.

The output follows the Agent eXperience Interface, so an agent reading it does not have
to parse prose:

```
packages[2]: pkg-x,pkg-y
help[1]: Run `plugins list` to see which of them are installed
```

An empty result is stated explicitly as `packages: 0 packages found with keywords: a, b`.
The previous `found one package: x` / `found the following packages:` wording is gone —
anything scripted against those strings needs updating.
