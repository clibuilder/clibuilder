---
'clibuilder': major
---

`clibuilder` 12 is ESM-only: the CommonJS build in `cjs/` is gone.

- `require('clibuilder')`, `require('clibuilder/axi')`, `require('clibuilder/testing')` and `require('clibuilder/compile-cache')` still work on Node.js 20.19 and later, the `engines` floor, through `require(esm)`.
- The `exports` shape changed: every entry point is `{ types, default }` pointing at `esm/`, with no `import` or `require` condition, and the top-level `main` field is removed. `types` stays for older resolvers.
- TypeScript reports error TS1479 (an ES module cannot be imported with `require`) in a CommonJS file compiled with `module: node16`, or with `module: nodenext` before TypeScript 5.8. The declarations were already ESM in 11.x, so this is not new, but it now matches what Node does. *Migrate:* use TypeScript 5.8 or later with `module: nodenext`. `module: commonjs` with `moduleResolution: node10` still resolves the root entry through the top-level `types` field.
- Jest's CommonJS runtime cannot load ES modules. *Migrate:* run Jest with ESM support, or move to a test runner that loads ES modules, such as Vitest or `node --test`.

The published package unpacks to 393 kB in 187 files, down from 633 kB in 192 files.
