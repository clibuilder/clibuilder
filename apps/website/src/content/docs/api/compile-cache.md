---
title: enableCompileCache()
description: Opt into Node's V8 compile cache to cut your CLI's startup time.
---

```ts
import { enableCompileCache } from 'clibuilder/compile-cache'

function enableCompileCache(cacheDir?: string): enableCompileCache.Result
```

Turns on Node's V8 compile cache for the rest of the process: the compiled bytecode of every module
loaded *after* the call is cached on disk, so the second and later runs skip compiling them again.

It lives at its own entry point — `clibuilder/compile-cache` — which pulls in nothing but
`node:module`, so importing it costs no startup time.

## Usage

In ESM, load `clibuilder` with `await import` so it isn't compiled before the cache is on:

```js
#!/usr/bin/env node
import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

const { cli } = await import('clibuilder')

cli({ name: 'app', version: '1.0.0' })
  .default({ run() { /* ... */ } })
  .parse(process.argv)
```

In CJS:

```js
#!/usr/bin/env node
require('clibuilder/compile-cache').enableCompileCache()

const { cli } = require('clibuilder')
```

## Two rules

**Call it first.** The cache only applies to modules compiled after the call. Calling it from your
command's `run()`, or from inside `cli()`, caches nothing — which is exactly why `clibuilder` doesn't
turn it on for you. By the time `cli()` runs, everything worth caching is already compiled.

**In ESM, use `await import`.** A static `import` compiles the whole module graph before any of it
runs, so a statically imported `cli` is already compiled by the time `enableCompileCache()` executes.

## What it buys you

Measured on the repository's `test-apps` fixtures — node 24, median of 25 warm runs:

| Build | Without | With |
| --- | --- | --- |
| ESM | 86ms | 81ms |
| CJS | 43ms | 37ms |

## Result

```ts
namespace enableCompileCache {
  type Result = {
    enabled: boolean
    directory?: string
    message?: string
  }
}
```

| Field | Description |
| --- | --- |
| `enabled` | `true` when the cache is active for the rest of the process |
| `directory` | Where the cache is stored, when enabled |
| `message` | Why it could not be enabled |

The helper **never throws**. On a runtime without the API — Node before 22.1, and currently Bun and
Deno — it leaves the process untouched and reports why:

```js
const { enabled, directory, message } = enableCompileCache()
```

## Choosing a directory

Node picks the location by default. Pass one to override it:

```js
enableCompileCache(path.join(os.homedir(), '.cache/my-cli'))
```

If the user has set the `NODE_COMPILE_CACHE` environment variable, their directory wins and the
argument is ignored. That variable also lets them switch the cache on for a CLI that never calls this
helper.
