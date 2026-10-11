---
'clibuilder': patch
---

Replace the `jsonc-parser` dependency with an internal comment and trailing-comma stripper that feeds `JSON.parse`. Valid `.json` and `.jsonc` config files parse as before, and core's only dependencies are now `@toon-format/toon` and `args-minus`. A parse error message now carries the `JSON.parse` message instead of a `jsonc-parser` error code.
