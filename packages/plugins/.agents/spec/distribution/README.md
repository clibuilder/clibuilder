---
spec-type: reference
---

# Distribution

## Subject

The package manifest, entry points, runtime compatibility contract, and
published files that make `@clibuilder/plugins` consumable.

- Built by `tsdown` (`tsdown.config.ts`): ESM in `esm/`, one module per source
  file, with declarations beside it; and a CJS bundle in `cjs/`, with
  `cjs/package.json` marking it CommonJS. Every dependency stays external.
  `tsdown` does not typecheck, so `build` runs `tsc --noEmit` alongside it.
- The published declarations import only `clibuilder`; they never reach into
  `zod`, which is `clibuilder`'s dependency, not this package's.
- Exports: `plugins`, `pluginsCommand`, `loadPlugins`, and the type
  `PluginActivationContext`.
- `clibuilder` is a peer dependency at `^11.5.0 || ^12.0.0`: 11.5.0 is the
  release that adds `use()`, which `plugins()` plugs into.
- `import-meta-resolve`, `find-installed-packages` and `search-packages` are
  dependencies. The last two are imported lazily, only when `plugins list` or
  `plugins search` runs.
- Node.js `>= 20.19`, matching `clibuilder`.
