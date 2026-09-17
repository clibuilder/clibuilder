---
spec-type: reference
concept: [packaging]
---

# Tooling

Governs `jest.config.mjs`, `tsconfig.json`, and the `package.json` scripts —
how the framework is built, exercised, and released.

## Subject

The build, test, coverage, dependency-check, and release tooling that verifies
the framework contract across both published module formats.

Both formats are built from one source: `ESM` by the compiler and `CJS` by a
bundler, so a contract change cannot land in one and miss the other. `verify`
is the composite gate — clean, then build and cover and dependency-check in
parallel — and is what a release runs behind.
