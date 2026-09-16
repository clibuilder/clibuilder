---
spec-type: reference
concept: [packaging]
---

# Distribution

Governs `package.json`, `package.cjs.json`, `ts/index.ts`, `ts/zod.ts`, and
`ts/compile_cache.ts` — what the package publishes and what a consumer may
import from it.

## Subject

The package manifest, dual `ESM`/`CJS` entry points, the opt-in startup cache
helper, the supported runtime range, and the published files that make
`clibuilder` consumable by an application or a plugin.

The public entry point re-exports the validator (`ts/zod.ts`) as well as the
framework's own surface. That re-export is load-bearing for consumers today —
a command author declares argument and option types with it — and it is also
what pins every consumer to the framework's validator major. Replacing it is
tracked as a followup in this spec's ledger and is the subject of a deferred
CR, so the re-export is recorded here as current published surface rather than
as a settled design.

`files` is a whitelist (`cjs`, `esm`, `ts`) with the internal and test patterns
excluded, which is what keeps this spec directory out of the published
tarball — the reason the spec can be colocated rather than hoisted.
