---
'clibuilder': patch
---

Fix the published types: `cli({ streams })` now takes a small structural stream type (`write(chunk: string)`, with optional `isTTY` and `hasColors()`) instead of `NodeJS.WritableStream`. A TypeScript consumer without `@types/node` and with `skipLibCheck: false` no longer gets error TS2503 (cannot find namespace `NodeJS`) from `clibuilder`'s declarations. `process.stdout` and `process.stderr` still fit.
