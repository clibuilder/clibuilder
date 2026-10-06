# RFC: slim clibuilder's runtime dependencies for the next major

- **Status:** Proposed. Research and design only; nothing is implemented yet.
- **Target:** `clibuilder@12` (breaking)
- **Related:** [#639](https://github.com/clibuilder/clibuilder/issues/639) (AXI-native clibuilder), `@clibuilder/axi` (#630, #636)
- **Scope:** what `clibuilder` installs, and the public API changes that follow from removing it. Not the #639 behaviour changes, though section 7 checks the plan against them.

## 1. Summary

Installing `clibuilder@11.3.2` pulls in **43 packages and about 54 MB** of `node_modules`. The cost is not where users assume:

| Source | Weight | Why |
|---|---|---|
| `type-plus@8.0.0-beta.12` → peer `typescript` | **~31 MB**: `typescript` plus `@typescript/typescript-linux-x64`, ~10.6 MB for type-plus itself | type-plus declares `typescript >= 5.4` as a peer, and npm ≥ 7 installs peers automatically. standard-log and tersify also depend on type-plus. |
| `zod@3.25.76` | 5.1 MB, 1 package | option and config types |
| `find-installed-packages` | 18 packages: glob, rimraf, temp, minimatch… | `plugins list` builtin only, already lazy-imported |
| everything else | ~3 MB, ~10 packages | |

clibuilder itself unpacks to 1.7 MB, mainly because the CJS build bundles every dependency (`esbuild --bundle` with no externals). Those dependencies are also installed again as real packages.

**Recommendation.**

- **Core `clibuilder@12` should have zero required runtime dependencies.** Zero, or one if plugin loading stays in core (section 5.3).
- **Options:** replace zod with **built-in type descriptors** that also implement [Standard Schema](https://standardschema.dev). Option (c) below.
- **Validation:** accept any Standard Schema validator (zod ≥ 3.24, zod 4, valibot, arktype, …) for extra validation and for `config`.
- **Logging:** replace standard-log with a small built-in `UI` over injectable `stdout`/`stderr` streams.
- **Small helpers:** inline them.
- **Plugin discovery:** move the `plugins list` / `plugins search` builtins to a separate package. The heavy dependencies leave the default install.

## 2. Inventory

Footprint numbers come from installing each dependency alone with `npm install --ignore-scripts` on 2026-10-06. "pkgs" counts the dependency itself plus its transitive dependencies.

| Dependency | Used in (`packages/clibuilder/ts/…`) | Why | Hot path? | pkgs | node_modules | Plan |
|---|---|---|---|---|---|---|
| `zod` ^3.22 (3.25.76) | `zod.ts`, `cli.ts` (all public command types), `invocation/lookup.ts`, `render/help.ts`, `app/builder.ts` (`config` validation), `builtin/base_command.ts`, `render/format.ts`, `builtin/plugin_commands/search.ts` | option, argument and config types; argv conversion by introspection; help rendering | **yes**, every parse | 1 | 5.1 MB | **remove**: built-in descriptors plus Standard Schema (section 3) |
| `standard-log` 13.3.1 | `drivers/context.ts`, `drivers/logger.ts`, `drivers/context.mock.ts` (`standard-log/testing`), `testing/test_command.ts` | level filtering for `ui`, console reporter, capturing messages in `testCommand` | **yes**, imported at startup | 10 | 44 MB (via type-plus → typescript) | **remove**: built-in UI (section 4) |
| `standard-log-color` 13.3.1 | `drivers/context.ts` | colours clibuilder's own messages | yes | 14 | 45 MB (shares the above) | **remove**: `node:util` `styleText` |
| `type-plus` 8.0.0-beta.12 | `cli.ts`, `app/state.ts`, `app/builder.ts` (`RequiredPick`, `UnionOfValues`, `forEachKey`); `invocation/lookup.ts` (`findKey`, `reduceByKey`); `render/help.ts` (`reduceByKey`, `someKey`); `drivers/context.mock.ts` (`required`) | 2 utility types and 5 one-line object helpers | yes | 6 | 43 MB (peer `typescript`) | **remove**: inline them (~30 lines). A pinned **beta** in a published runtime range is a hazard in its own right. |
| `tersify` 4.0.8 | `render/help.ts`: `toPrettyType` for the help `Config:` section | prints a zod object shape as a type literal | help only | 3 (acorn) | 1.4 MB | **remove**: the section is rebuilt from JSON Schema, or dropped (section 3.4) |
| `pad-right` 0.2.2 | `render/help.ts` | column alignment | help only | 2 | 40 KB | **remove**: `String.prototype.padEnd` |
| `wordwrap` 1.0.0 | `render/help.ts` | wraps command and alias lists at 80 columns | help only | 1 | 64 KB | **remove**: ~15-line internal wrap |
| `tmp` 0.2.7 | `drivers/context.mock.ts`, reached from `testing/test_command.ts` | temp cwd for `testCommand` | no, but **leaks into the main entry**: `index.ts` re-exports `testing/test_command.js` | 1 | 56 KB | **remove**: `fs.mkdtempSync(os.tmpdir())`. Export `testCommand` from `clibuilder/testing` only. |
| `tslib` ^2.5 | nowhere (no `importHelpers`; target ES2020) | none | no | 1 | 128 KB | **remove** (it is also listed in `devDependencies`) |
| `js-yaml` 4.x | `config.ts` | `.yaml` / `.yml` config files | only when a cli sets `config` | 2 | 1.2 MB | optional peer (section 5.2) |
| `jsonc-parser` 3.3.1 | `config.ts` | `.json` / `.jsonc` / `rc` config files with comments | only when a cli sets `config` | 1 | 256 KB | core, optional peer, or a tiny internal parser (open question Q4) |
| `import-meta-resolve` 4.2.0 | `drivers/resolve_plugin.ts` | resolves plugin specifiers from the project cwd using ESM rules (`import.meta.resolve(spec, parent)` is still flagged in Node) | only when `config.plugins` is set | 1 | 140 KB | keep, wherever plugin loading lives (section 5.3) |
| `find-installed-packages` 4.0.1 | `builtin/plugin_commands/npm.ts` (lazy `import()`) | `plugins list` | no | **18** | 704 KB | move to `@clibuilder/plugins` |
| `search-packages` 2.2.3 | `builtin/plugin_commands/npm.ts` (lazy `import()`) | `plugins search` | no | 1 | 120 KB | move to `@clibuilder/plugins` |

The full install has no duplicate versions: type-plus, tersify and standard-log are each deduped to one copy. The cost is breadth, plus the peer `typescript`, not duplication.

Two side findings came out of the inventory:

- `parseConfig` (`app/builder.ts`) validates with `safeParse` but stores the **input**, not `r.data`. Defaults and transforms in a config schema are silently dropped. The redesign fixes this by using the validator's output.
- `cli.UsageError`'s `expect-single` variant carries `keyType: z.ZodType`. That puts a zod object on a public error type, which `@clibuilder/axi`'s usage handler receives.

## 3. zod

### 3.1 How it is exposed today

- **Public types.** Every command type is generic over zod: `Command<Context, ConfigType extends z.ZodTypeAny, A, O>`. Options and arguments take `type?: z.ZodType | z.ZodOptionalType`. `RunArgs` infers `args` through `z.infer`, and `this.config` is `z.infer<ConfigType>`.
- **Re-export.** clibuilder re-exports `z` (`index.ts` → `zod.ts`). Every downstream CLI imports `z` **from `clibuilder`**; none depends on `zod` directly. zod is a hidden transitive dependency of their public surface.
- **Runtime introspection.** The parser does not just validate. It **introspects** the schema to decide how argv is consumed:
  - a boolean takes no value;
  - an array takes repeated values or the rest of the arguments;
  - a number is converted from its string form;
  - an enum's values are listed in error messages.

  It does this with `Object.getPrototypeOf(t).constructor.name === 'ZodBoolean'`, `._def.innerType`, `.element`, `.options` and `.isOptional()`. These are zod v3 internals. Under zod 4 the internal layout moved (`_zod.def`), so the v3 typings and the introspection both break. **clibuilder cannot support zod 4 without a rewrite of this layer either way.**

### 3.2 The constraint any option must meet

A CLI needs two things from an option type:

1. **Shape**, to tokenize argv: flag or value, single or repeated, number conversion, enum values for help and errors.
2. **Validation**, plus a static output type for `args`.

Standard Schema (`~standard: { version, vendor, validate, types }`) provides **only (2)**. It has no introspection. The 1.1 `StandardJSONSchemaV1` extension adds `jsonSchema.input()`/`output()`, but it is optional and not universally implemented. A library that accepts *only* Standard Schema must therefore either guess the shape, or require the JSON Schema extension (trpc-cli's route, via JSON Schema conversion).

### 3.3 Options

| | Approach | Deps | Typed `args` | Shape for argv | Migration | Verdict |
|---|---|---|---|---|---|---|
| **a** | Standard Schema only: users bring zod, valibot, arktype… | 0 (`@standard-schema/spec` is types-only; copy the interface) | yes, via `StandardSchemaV1.InferOutput` | not available in general. Needs the JSON Schema extension, or a separate `kind` field anyway. | users add a validator dependency | incomplete on its own |
| **b** | zod as a `peerDependency` | 0 installed by clibuilder, but users must install zod | yes | introspection kept | add `zod` to each CLI and import from it | still locks to one zod major; the introspection rewrite for v4 is still needed. Moves the weight without removing it. |
| **c** | **built-in descriptors, plus optional Standard Schema validation** | 0 | yes, from the descriptor; a Standard Schema's output type wins when given | owned by clibuilder | mechanical rename (section 6) | **recommended** |
| **d** | keep zod 3 | 5 MB | yes | yes | none | v3 is in maintenance, and v4 users get type errors. This is the main complaint. |

### 3.4 Recommended design (c)

clibuilder exports a tiny builder set, here `t`; the name is open question Q1. It covers exactly what the parser understands. Each descriptor is plain data **and** implements `~standard`, so descriptors and third-party schemas go through one code path:

```ts
import { t } from 'clibuilder'

options: {
  format: { type: t.optional(t.enum(['toon', 'text', 'json'])), default: 'toon', description: '…' },
  tag:    { type: t.array(t.string()), description: '…' },
  port:   { type: t.number(), description: '…' },
  dry:    { type: t.optional(t.boolean()), description: '…' }   // also the default when `type` is omitted
}
```

- **Descriptors:** `string`, `number`, `boolean`, `array(x)`, `enum([...])`, `literal`/`union` of literals (repobuddy uses `z.union([z.literal(…)…])`), and `optional(x)`, plus `.optional()` chaining because repobuddy/buddy uses that form.
- **Extra validation:** an entry may also carry `schema?: StandardSchemaV1`. It runs after argv conversion, on the converted value. When present, its output type becomes the `args` type, so `schema: z.string().email()` or a valibot pipe works with any vendor and any zod major. Async `validate` is awaited.
- **Schema without descriptor (convenience):** if `type` is itself a Standard Schema that is not a clibuilder descriptor, the shape comes from `~standard.jsonSchema` when the vendor implements it. Otherwise the option is a single string value. Open question Q2.
- **`config`:** takes any `StandardSchemaV1`, or a descriptor object. Validation uses `~standard.validate`, and the validator's **output** is stored, which fixes the dropped-defaults bug. The help `Config:` section is generated from `~standard.jsonSchema` when available and omitted otherwise. That removes `tersify`.
- **Errors:** issues from a foreign schema are mapped into clibuilder's own `invalid-value` usage error code. Following axi's rule, a dependency's text is never forwarded raw. `keyType` becomes a descriptor kind string (`'boolean' | 'number' | …`) instead of a schema object.
- **Types:** `@standard-schema/spec`'s interfaces are vendored into `ts/standard_schema.ts` (the spec explicitly allows copying), so there is no dependency at all.

**zod v3 vs v4.** Under (c), both majors work as `schema:` or `config:` values: zod ≥ 3.24 implements `~standard`, and zod 4 does natively. Inference uses `~standard.types`, so clibuilder's typings no longer import any zod type. CLIs that keep zod pick their own major.

## 4. Logging: standard-log and standard-log-color

**What it does today.**

- **clibuilder's own `ui`:** a standard-log logger at `info`, with a colour reporter. `--verbose`, `--silent` and `--debug-cli` raise or lower its level. Messages logged before the level is known are buffered and replayed (`createBuilderUI` / `dump`).
- **Per-command `this.ui`:** `createCommandUI(id)`, an `info`/`warn`/`error`/`debug` logger plus `showHelp`/`showVersion`, behind the `DisplayLevel` port in `core/ports.ts`.
- **`testCommand`:** captures messages through `standard-log/testing`'s in-memory reporter.

**Usage downstream.** No consumer imports standard-log. They use `this.ui.info` and `this.ui.showHelp` only. One spec (repobuddy/buddy `check_dependencies_command.spec.ts`) asserts on `testCommand`'s `messages`.

**Recommendation.** The `UI` port in `core/ports.ts` already is the interface. Implement it directly:

```ts
type Streams = { stdout: Writable; stderr: Writable }   // injectable; process.stdout/stderr by default
```

- **Levels:** a ~20-line threshold over `DisplayLevel` (`none` / `info` / `debug` / `trace`). The pre-level buffer stays as is.
- **Colour:** `util.styleText` (Node ≥ 20.12; `engines` is already ≥ 20.19), gated on `stream.isTTY` and `NO_COLOR` / `FORCE_COLOR`.
- **`cli({ streams })`:** lets embedders and tests capture output. This is the stricli/clipanion model.
- **`testCommand`:** passes in-memory streams and keeps returning `messages` (one entry per line, as today), so the one asserting spec keeps working.
- **Bridge:** anyone who wants standard-log, pino and so on wraps it in a `UI`. No adapter ships in core.

**Fit with #639.** #639 wants results and usage errors on **stdout** and diagnostics on **stderr**. With explicit streams this becomes a routing table rather than a reporter config:

| Goes to stdout | Goes to stderr |
|---|---|
| the encoded result channel, `--help`, `--version` | `ui.warn` / `ui.error` / `ui.debug` |

Where `ui.info` goes is an open question (Q5): today it is effectively stdout through `console.info`. Removing standard-log is a prerequisite that makes #639's routing cheap; it does not decide it.

## 5. The rest

### 5.1 Trivial removals (no API change)

| Remove | Replacement |
|---|---|
| `pad-right` | `padEnd` |
| `wordwrap` | internal `wrap(text, 80)` |
| `tslib` | nothing |
| `tmp` | `mkdtempSync` |
| `type-plus` | ~30 lines of local helpers and types (`RequiredPick`, `UnionOfValues`, `forEachKey`, `findKey`, `reduceByKey`, `someKey`, `required`) |
| `tersify` | section 3.4 |

Also stop re-exporting `testCommand` from the main entry, so test-only code stays off the import graph of every CLI (repobuddy/buddy imports it from the root today).

### 5.2 Config loading

A subpath export alone **does not** reduce install size, because `dependencies` are installed whatever is imported. Only a separate package or an optional peer does.

| Format | Core v12 |
|---|---|
| `package.json` field, `.json`, `.js` / `.mjs` / `.cjs` | built in, no dependencies |
| `.yaml` / `.yml` | `js-yaml` as an **optional peer** (`peerDependenciesMeta.optional`), loaded with dynamic `import()`. A missing peer gives a coded error naming the package to install. |
| `.jsonc` / rc with comments | see Q4 |

For Q4 the choices are: keep `jsonc-parser` (0 deps, 256 KB, good error codes) as a regular dependency, make it an optional peer like js-yaml, or replace it with a small internal comment and trailing-comma stripper feeding `JSON.parse`.

### 5.3 Plugins

- **Loading** (`config.plugins` → `import()` → `activate`): needs only `import-meta-resolve` (0 deps, 140 KB). repobuddy/buddy treats `config: true` plugin loading as load-bearing. **Keep loading in core**, with `import-meta-resolve` as core's single dependency. Alternatively, move it out with discovery (Q3).
- **Discovery** (`plugins list` / `plugins search` builtins): ships as a new `@clibuilder/plugins` package that owns `find-installed-packages` (18 packages) and `search-packages`. A CLI opts in with `.command(pluginsCommand)` or equivalent. Without it, core no longer injects the `plugins` group automatically when `config` or `keywords` is set.

### 5.4 Build output

`engines` is already `>= 20.19`, where `require(esm)` works unflagged. Dropping the CJS bundle in v12 roughly halves the published package and removes the double-shipping of bundled dependencies (Q6).

### 5.5 Target dependency set

| Package | `dependencies` | optional `peerDependencies` | install (est.) |
|---|---|---|---|
| `clibuilder@12` | `import-meta-resolve` (or none, under Q3) | `js-yaml`, (`jsonc-parser` under Q4) | **2 packages, ~0.5 MB**, down from 43 packages and ~54 MB |
| `@clibuilder/plugins` (new) | `find-installed-packages`, `search-packages` | — | opt-in |
| `@clibuilder/axi` | `@toon-format/toon` (0 deps, ~120 KB) | `clibuilder ^12` | unchanged weight |

## 6. Comparable libraries

npm on 2026-10-06; dependency counts are runtime direct / total.

| Library | Deps | Option declaration | Standard Schema |
|---|---|---|---|
| citty 0.2 | 0 / 0 | `{ type: 'string' }` descriptors | no |
| cac 7 | 0 / 0 | `.option('--x <v>')` strings | no |
| commander 15 | 0 / 0 | fluent; typing via `extra-typings` | no |
| @stricli/core 1.3 | 0 / 0 | typed `parse` functions; injectable `context.process` | no |
| gunshi 0.37 | 0 / 0 | `{ type: 'string' }` descriptors | not verified |
| @bomb.sh/args 0.3 | 0 / 0 | flags plus `schema` | yes |
| cleye 2.7 | 3 / 4 | `{ type: String }` | no |
| clipanion 4 rc | 1 / 2 (typanion) | classes; injectable `context.stdout` | no |
| cmd-ts 0.15 | 4 / 7 | combinators | no |
| yargs 18 | 6 / 13 | fluent | no |
| @oclif/core 5 | 18 / 38 | `Flags.string()` | no |
| trpc-cli 0.17 | 1 / 2 | procedure input converted to JSON Schema | yes, via JSON Schema |
| @optique/core 1.3 | 0 / 0 | parser combinators; `@optique/standard-schema` add-on | yes, via add-on |
| incur 0.7 | 7 / 8 (zod 4 pinned, MCP SDK) | zod schemas | zod only |

Takeaways:

- Zero dependencies is the norm for the libraries clibuilder competes with.
- The dominant declaration style is built-in descriptors that infer types: citty, cleye, gunshi. This is option (c).
- Libraries that accept Standard Schema either add it on top of their own shape model (optique, @bomb.sh/args) or lean on JSON Schema conversion (trpc-cli). None uses bare `~standard` for argv shape, which confirms section 3.2.
- incur shows the cost of pinning one schema library: the same coupling clibuilder has to zod 3 today.

## 7. Downstream impact and migration

Every `clibuilder` dependent under `~/code` was surveyed. cyberplace, gherkin-cli, universal-plugin and cyber-asana, though listed in #639's survey, do **not** depend on clibuilder.

Common to all six:

- none imports `zod` or `standard-log` directly;
- none uses `z.object`, refinements, `z.coerce` or `.describe()`;
- every `z` comes from `'clibuilder'`.

| Package | `type: z.` uses | ui / testing | plugins / config | Cost |
|---|---|---|---|---|
| cyber-mux | ~50; also annotates `z.ZodOptional<z.ZodEnum<…>>`; reads `command.options` | — | `activate` | **high**, but mechanical |
| agent-harness | ~17 | — | own discovery | med |
| buddy-agent-harness | ~22; a test reads `options.format.default` | — | — | med |
| repobuddy/buddy | 3 (`.optional()` chain) | `ui.info`; one spec asserts `messages`; `testCommand` from the root entry | **`config: true` is load-bearing** for plugin loading | med |
| repobuddy/typescript | 3 (`z.union` of literals) | `ui.info`; `testCommand` from `clibuilder/testing` | `activate` | low |
| cyber-sdd | 0 | `showHelp` | — | low |
| `@clibuilder/axi` (in repo) | `format.ts`, `truncate.ts` | uses `cli.UsageError` (`keyType` changes) | — | low; release in lockstep |

### Migration path

1. **v11 minor (non-breaking prep).**
   - Add `t` descriptors, the `schema:` field, Standard Schema `config`, and `cli({ streams })` alongside the zod path.
   - Mark the `z` re-export and the root `testCommand` export `@deprecated`.
   - Fix the `parseConfig` output bug.
   - Users can migrate at their own pace and get v4-compatible validation early.
2. **Codemod.** `z.<kind>(` → `t.<kind>(` for the supported kinds, and `import { z } from 'clibuilder'` → `import { t } from 'clibuilder'`. Anything outside the supported subset is flagged rather than rewritten. Type annotations such as cyber-mux's `z.ZodOptional<…>` become `t.Optional<…>` or are dropped in favour of `satisfies`.
3. **v12 major.**
   - Remove zod, standard-log, standard-log-color, type-plus, tersify, pad-right, wordwrap, tmp and tslib.
   - Make `js-yaml` an optional peer.
   - Move plugin discovery to `@clibuilder/plugins`.
   - Optionally drop CJS.
   - Ship together with the #639 breaks so users take one major, not two.
4. **Release `@clibuilder/axi`** with peer `clibuilder ^12` in the same release train.

## 8. Open questions

1. **Descriptor naming.** `t`, `arg`, or keep the name `z` as a compatible subset? Keeping `z` makes most downstream code compile untouched. It also misleads readers into assuming full zod, and it collides with a user's own `import { z } from 'zod'`. The recommendation is `t` plus the codemod.
2. **Bare Standard Schema as `type`.** Should a non-descriptor schema be allowed as `type` at all, with shape from `~standard.jsonSchema` or a fallback to a single string? Or must shape always come from a descriptor, with the schema only in `schema:`? The second is stricter and clearer.
3. **Plugin loading.** Should it stay in core, keeping `import-meta-resolve` (recommended, because repobuddy/buddy relies on it), or move entirely to `@clibuilder/plugins` for a zero-dependency core?
4. **JSONC.** Keep `jsonc-parser`, make it an optional peer, or use an internal stripper? YAML as an optional peer: acceptable friction for CLIs whose users write YAML config?
5. **`ui.info` routing under #639.** Should it go to stdout (today's behaviour) or stderr, once a result channel owns stdout?
6. **Drop the CJS build in v12?** `engines >= 20.19` already guarantees `require(esm)`.
7. **toon in core.** If #639 makes `--format` (toon/json/text) built in, does `@toon-format/toon` (0 deps, ~120 KB) become a core dependency? The alternatives are that core keeps its hand-rolled toon for flat collections, or that core only exposes a formatter hook and toon stays in `@clibuilder/axi`.
8. **`args-minus`.** Should core's argv tokenizer move onto the in-house `args-minus` (0 deps) as part of the same rewrite of `invocation/lookup.ts`, or stay separate work?
