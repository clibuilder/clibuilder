---
spec-type: reference
---

# Distribution

## Subject

The package manifest, entry points, runtime compatibility contract, and
published files that make `args-minus` consumable by supported JavaScript
runtimes.

## Contract

- ESM only; one entry point (`.`) with `types`, `import`, and `default`
  conditions that all resolve to files in `esm/`.
- Supported: Node 20+, Deno 2+, Bun 1+, evergreen browsers; `engines.node`
  agrees.
- No dependency and no Node API in the published JavaScript.
- Published files: `esm/` (minus tests and maps), `readme.md`, `package.json`.
  Specs and `.agents/` are not published.
- `scripts/verify-dist.mjs` (run by `build`) checks the above and imports the
  package by name in Node; the CI `args-minus-runtimes` job adds Deno and Bun.
