---
"clibuilder": patch
---

Fix `import('clibuilder')` failing with `ERR_MODULE_NOT_FOUND` for `esm/invocation/argv.internal.js` (#617).

The package's `files` list excludes `**/*.internal.*`, which also dropped a module the ESM build imports at runtime. The module is renamed to `argv_occurrences`, so it is published again. A test now fails if a published module imports a file the `files` list excludes.
