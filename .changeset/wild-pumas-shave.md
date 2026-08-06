---
"clibuilder": minor
---

Add `clibuilder/compile-cache`, an opt-in helper to turn on node's V8 compile cache from your cli's bin script.

```js
import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

const { cli } = await import('clibuilder')
```

Measured on the `test-apps` fixtures (node 24, median of 25 warm runs), startup drops from 86ms to 81ms for the `ESM` build and from 43ms to 37ms for the `CJS` build.

The helper never throws, and does nothing on runtimes without the API (node < 22.1, `bun`, `deno`). `NODE_COMPILE_CACHE` takes precedence when the user sets it.
