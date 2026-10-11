---
'@clibuilder/plugins': minor
---

Requires `clibuilder` 12, which no longer loads plugins itself: `plugins()` is now the only way a CLI loads plugins and gets the `plugins list` / `plugins search` group. The peer range is `clibuilder ^12.0.0`. With `clibuilder` 11, keep `@clibuilder/plugins` 0.1.

`plugins()` no longer marks its extension for `clibuilder` 11 to skip its own plugin loading, since that loading is gone.
