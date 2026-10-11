---
spec-type: reference
---

# Distribution

## Subject

The package manifest, entry points, runtime compatibility contract, and
published files that make `@clibuilder/plugins` consumable.

- ESM (`esm/`, built by `tsc`) and CJS (`cjs/`, bundled by `esbuild` with every
  package left external), with types from `esm/`, as `@clibuilder/axi` does.
- Exports: `plugins`, `pluginsCommand`, `loadPlugins`, and the type
  `PluginActivationContext`.
- `clibuilder` is a peer dependency at `^11.5.0 || ^12.0.0`: 11.5.0 is the
  release that adds `use()`, which `plugins()` plugs into.
- `import-meta-resolve`, `find-installed-packages` and `search-packages` are
  dependencies. The last two are imported lazily, only when `plugins list` or
  `plugins search` runs.
- Node.js `>= 20.19`, matching `clibuilder`.
