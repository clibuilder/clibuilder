---
spec-type: reference
concept: [packaging]
---

# Tooling

Governs `jest.config.mjs`, `tsconfig.json`, and the `package.json` scripts —
how the framework is built, exercised, and released.

## Subject

The build, test, coverage, dependency-check, and release tooling that verifies
the framework contract in its one published module format, `ESM`, built by the
compiler. `verify`
is the composite gate — clean, then build and cover and dependency-check in
parallel — and is what a release runs behind.
