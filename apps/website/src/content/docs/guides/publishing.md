---
title: Publishing
description: Turn your clibuilder app into an installable, executable command.
---

## Add a shebang

Node needs to be told to run your entry file. Put a shebang on the first line:

```ts
#!/usr/bin/env node
import { cli } from 'clibuilder'

cli({ name: 'app', version: '1.0.0' })
  .default({ run() { /* ... */ } })
  .parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

TypeScript preserves a leading shebang in the emitted JavaScript, so this works in a `.ts` source
file. If you bundle, check that your bundler keeps it — esbuild has `--banner:js`, and most others
have an equivalent.

## Declare the binary

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": { "my-cli": "./esm/index.js" },
  "files": ["esm", "cjs"]
}
```

On POSIX systems the file also needs its executable bit set (`chmod +x`) — npm handles this on
install for files listed in `bin`, but a locally linked package may need it done manually.

## Keep `version` in sync

Since v8, `name` and `version` are values you pass to [`cli()`](/clibuilder/api/cli/) rather than
things read out of `package.json` at startup. That is what makes a bundled, standalone CLI possible —
but it does mean the version can drift from your manifest.

Two ways to avoid that:

**Import the manifest** — simple, but it means shipping `package.json` alongside your code:

```ts
import pkg from '../package.json' with { type: 'json' }

cli({ name: pkg.name, version: pkg.version })
```

**Inject at build time** — keeps the bundle standalone:

```sh
esbuild src/index.ts --bundle --platform=node \
  --define:__VERSION__='"1.0.0"' --outfile=dist/index.js
```

## Handle failures

`parse()` returns a promise. Nothing catches for you, so an unhandled rejection would print a stack
trace at the user. The convention is to exit with the error's own code when it has one:

```ts
app.parse(process.argv)
  .catch(e => process.exit(e?.code || 1))
```

Usage problems — an unknown flag, a missing argument, a config that fails validation — are handled
inside `clibuilder`: it prints the help message and resolves. Only errors thrown by your own `run()`
reach this `catch`.

## Cut startup time

Node can cache the compiled bytecode of every module your CLI loads, so the second and later runs
skip compiling them. It is opt-in, and it has to be the first thing your bin script does:

```js
#!/usr/bin/env node
import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

const { cli } = await import('clibuilder')
```

The `await import` is load-bearing — a static `import` would compile `clibuilder` before the cache is
on. See [`enableCompileCache()`](/clibuilder/api/compile-cache/) for the CJS form, the measured
numbers, and how users can point the cache elsewhere.

## Ship both module formats

If you expect consumers to `import` your commands as a library as well as run the binary, publish ESM
and CJS, as `clibuilder` itself does:

```json
{
  "type": "module",
  "main": "./cjs/index.js",
  "types": "./esm/index.d.ts",
  "exports": {
    "types": "./esm/index.d.ts",
    "import": "./esm/index.js",
    "require": "./cjs/index.js",
    "default": "./cjs/index.js"
  }
}
```

If your package is only ever run as a command, one format is enough.
