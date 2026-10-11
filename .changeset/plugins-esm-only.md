---
'@clibuilder/plugins': minor
---

`@clibuilder/plugins` is ESM-only: the CommonJS build in `cjs/` is gone.

- `require('@clibuilder/plugins')` still works on Node.js 20.19 and later, the `engines` floor, through `require(esm)`.
- The `exports` shape changed: the entry point is `{ types, default }` pointing at `esm/`, with no `import` or `require` condition, and the top-level `main` field is removed. `types` stays for older resolvers.
- TypeScript reports error TS1479 (an ES module cannot be imported with `require`) in a CommonJS file compiled with `module: node16`, or with `module: nodenext` before TypeScript 5.8. The declarations were already ESM in 11.x, so this is not new, but it now matches what Node does. *Migrate:* use TypeScript 5.8 or later with `module: nodenext`. `module: commonjs` with `moduleResolution: node10` still resolves the root entry through the top-level `types` field.

The published package unpacks to 91 kB in 42 files.
