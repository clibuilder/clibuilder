---
"clibuilder": minor
---

Adopt `standard-log@^13.2.0` and `standard-log-color@^13.2.0` (from `^12.1.2` / `^12.1.1`), and bump the devDependencies `@repobuddy/jest` to `^6.0.0` and `@unional/fixture` to `^5.0.0`.

`standard-log@13.2.0` is the release that widened `@just-func/types` from `^0.5.0` to `^0.6.0`. The previously-resolved `@just-func/types@0.5.1` depends on `type-plus@^5.0.0`, and a caret on a `0.x` range cannot cross that minor, so every consumer of the older `standard-log` dragged a stale `type-plus@5.6.0` and `tersify@3.12.1` into its tree regardless of what it pinned itself. Adopting `standard-log` 13 removes that stale transitive `type-plus`/`tersify` pair from consumers' resolved trees.

No source changes were required: `clibuilder`'s own build, type-check, and test suite are unaffected. `standard-log` and `standard-log-color`'s major version bumps did not change their public API (their own release notes describe unrelated changes: a build-tooling switch and dropped ES5 output), but they are runtime `dependencies` of `clibuilder` whose types leak into its emitted declarations, and consumers now resolve a new major of a runtime dependency — hence a `minor` rather than `patch`.
