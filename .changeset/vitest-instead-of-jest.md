---
"clibuilder": patch
---

Run the test suite on vitest instead of jest.

This is a tooling-only change: no source, no public API, and no runtime dependency
moved. The published file list is the same 183 entries at the same sizes; only the
`devDependencies` block of the packaged `package.json` shrank.

The motivation is `jest-watch-toggle-config-2`, a fork that is being retired. Rather
than chase it onto a renamed package and drag jest 29 -> 30 behind it, both packages
now use vitest, which also removes the
`cross-env NODE_OPTIONS=--experimental-vm-modules` wrapper the ESM jest runs needed.

Removed: `@repobuddy/jest`, `@types/jest`, `cross-env`, `jest`, `jest-watch-suspend`,
`jest-watch-toggle-config-2`, `jest-watch-typeahead`, `ts-jest`. Added: `vitest`,
`@vitest/coverage-istanbul`, and an explicit `@types/node`, which the tsconfig now names
directly because `types` is pinned to `["node", "vitest/globals"]`.

Test counts are unchanged: 366 in `clibuilder` (362 passed, 3 skipped, 1 todo) and 51
in `args-minus` (36 passed, 1 skipped, 14 todo).
