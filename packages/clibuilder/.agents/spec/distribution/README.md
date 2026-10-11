---
spec-type: reference
concept: [packaging]
---

# Distribution

Governs `package.json`, `package.cjs.json`, `src/index.ts`, `src/drivers/yaml.ts`, and
`src/compile_cache.ts` — what the package publishes and what a consumer may
import from it.

## Subject

The package manifest, dual `ESM`/`CJS` entry points, the opt-in startup cache
helper, the supported runtime range, and the published files that make
`clibuilder` consumable by an application or a plugin.

The public entry point exports the framework's own surface and no validator:
there is no `z`, no `isZod*` guard and no `src/zod.ts`. `t` is the only way to
declare an argument or option type, and a command's `config` is any Standard
Schema, which the consumer brings.

The runtime dependencies are `@toon-format/toon`, `args-minus` and
`jsonc-parser`. There is no `zod`, `type-plus` or `tersify` dependency.
`js-yaml` is an optional peer dependency, loaded only when a YAML config file is
read; the CJS bundle leaves it external. When it is not installed, reading a
YAML config file fails with a `CliError` whose code is `missing-peer-dependency`
and whose details are `{ package: 'js-yaml' }`. JSON and JSONC config files
never need it.

`files` is a whitelist (`cjs`, `esm`, `src`) with the internal and test patterns
excluded, which is what keeps this spec directory out of the published
tarball — the reason the spec can be colocated rather than hoisted.
