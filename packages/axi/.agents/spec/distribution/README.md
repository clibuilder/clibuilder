---
spec-type: reference
---

# Distribution

## Subject

The package manifest, entry points, runtime compatibility contract, and
published files that make `@clibuilder/axi` consumable.

- ESM only (`esm/`, built by `tsc`), with types from `esm/`. The entry in
  `exports` is `{ types, default }`; a CommonJS consumer loads it with
  `require()` through `require(esm)`.
- `clibuilder` is a peer dependency, so the `z` and `exitCodes` it uses are the
  consumer's own instance, at `^11.2.0` — the release that added
  `onUsageError`, which `createUsageErrorHandler` plugs into.
  `@toon-format/toon` is a dependency.
- `require(esm)` is unflagged from Node.js 20.19: `engines` is `>= 20.19`.
