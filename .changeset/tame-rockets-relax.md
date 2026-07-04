---
"clibuilder": patch
---

Update dependencies (find-installed-packages, tmp, ts-jest, npm-run-all2, rimraf) and modernize internals: replace `.then()` chains with async/await in `builder.ts` and `plugins.ts`, bump `engines.node` to reflect actual ESM support.
