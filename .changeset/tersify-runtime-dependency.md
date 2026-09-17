---
"clibuilder": patch
---

Declare `tersify` as a runtime dependency.

`ts/ui.ts` imports `tersify` to render the `Config:` section of help, but it was listed
under `devDependencies`. The CJS build bundles with esbuild, so CJS consumers had it
inlined and never saw the problem. The ESM build is plain `tsc`, which emits a bare
specifier:

```js
// esm/ui.js
import { tersify } from 'tersify';
```

So an ESM consumer whose command declares a `config` schema could fail to resolve
`tersify` when help was rendered — it only worked where the package manager happened to
hoist it transitively. No API change; the dependency is simply declared where it is used.
