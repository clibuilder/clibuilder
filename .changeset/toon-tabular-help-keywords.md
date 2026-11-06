---
"clibuilder": minor
"@clibuilder/plugins": minor
---

`--format toon` now writes more collections as tables ([AXI conventions, change 1](https://clibuilder.github.io/clibuilder/getting-started/axi/#change-1-toon-only-for-collections)).

- Structured help (`--help`): `commands`, `arguments`, `options`, `examples` and `globalOptions` are tables. Every row carries the same columns, a column a row has nothing for is `null`, and an array cell (aliases, values, conflicts) is one comma-joined string. `json` is unchanged.
- `plugins search --fields keywords` is a table with the keywords joined on a space. `json` is unchanged.

Migration: if you decode `toon` help and read `aliases`, `values` or `conflicts` as arrays, split the string on `,`, and treat `null` as absent.
