---
spec-type: reference
---

# Distribution

## Subject

The package manifest, entry points, runtime compatibility contract, and
published files that make `@clibuilder/axi` consumable.

- ESM (`esm/`, built by `tsc`) and CJS (`cjs/`, bundled by `esbuild` with every
  package left external), with types from `esm/`.
- `clibuilder` is a peer dependency, so the `z` and `exitCodes` it uses are the
  consumer's own instance. `@toon-format/toon` is a dependency.
- `@toon-format/toon` ships ESM only, so the CJS entry relies on `require(esm)`:
  Node.js `>= 20.19`.
