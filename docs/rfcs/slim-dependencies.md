# RFC: slim clibuilder's runtime dependencies for the next major

- **Status:** Accepted. Maintainer decisions recorded 2026-10-11; the items in [section 8](#8-open-questions), [section 9.9](#99-open-questions) and [section 10](#10-still-open) are still open. Design only; nothing is implemented yet.
- **Amended 2026-10-10:** [section 9](#9-amendment-move-all-plugin-support-out-of-core) moves plugin loading out of core as well as discovery. It supersedes section 5.3 and closes Q3.
- **Target:** `clibuilder@12` (breaking), shipped with [axi-native](axi-native.md)
- **Related:** [#639](https://github.com/clibuilder/clibuilder/issues/639) (AXI-native clibuilder), `@clibuilder/axi` (#630, #636)
- **Scope:** what `clibuilder` installs, and the public API changes that follow from removing it. Not the #639 behaviour changes, though section 4 checks the plan against them.

## Decisions

Recorded by the maintainer on 2026-10-11. Each row is described in full in the section it points to.

| # | Decision | Section |
|---|---|---|
| 1 | zod is replaced by `t` descriptors: `t.string`, `t.number`, `t.int`, `t.boolean`, `t.literal`, `t.enum`, `t.array` and `t.custom`, with an options bag per kind, plus `.optional()` and `.check()`. They live in `packages/args-minus` and clibuilder re-exports them as `t`. No chained `.min().max()` and no string DSL. | 3.4 |
| 2 | The descriptor converts the raw argv string and carries its constraints (`min`, `max`, `pattern`, `values`) as readable data. `.check()` only validates, never changes the value or its type, and accepts a function or any Standard Schema whose output is ignored. | 3.4 |
| 3 | `t.custom(raw => value)` is the conversion hook for pure, synchronous functions of one raw string. Anything else belongs in `run()` and throws a `CliError`. No built-in formats and no coercion. | 3.4 |
| 4 | `config` is Standard Schema only, with no `t.object`. The validator's output is stored. Options have no `schema:` field and no `refine`, and descriptors do not implement `~standard`. | 3.4 |
| 5 | The Standard Schema v1 interface is vendored verbatim, so there is no dependency for it. | 3.4 |
| 6 | The prototype's findings are implementation rules for `t`. | 3.5 |
| 7 | standard-log and standard-log-color are replaced by a built-in UI over `cli({ streams })`, with two routing presets, `axi` and `console`. | 4 |
| 8 | `@toon-format/toon` is core's single third-party runtime dependency. | 5.5 |
| 9 | `args-minus` inlines its one type helper. type-plus 8.0.0 stays only as a devDependency. | 5.1 |
| 10 | Remove zod, standard-log, standard-log-color, tersify, type-plus, pad-right, wordwrap, tmp and tslib from core. | 2, 7 |
| 11 | The descriptor introspection form is a public, read-only union keyed on `kind`. Its exact field names are finalized in the implementation PR. | 3.4 |
| 12 | The level-to-stream routing behind the presets is internal in v12. | 4 |
| 13 | The descriptor work lands in `args-minus` first; clibuilder then re-exports `t` and moves its parser onto `args-minus`. The zod path stays through v11 minors and is removed in v12. | 7 |

## 1. Summary

Installing `clibuilder@11.3.2` pulls in **43 packages and about 54 MB** of `node_modules`. The cost is not where users assume:

| Source | Weight | Why |
|---|---|---|
| `type-plus@8.0.0-beta.12` → peer `typescript` | **~31 MB**: `typescript` plus `@typescript/typescript-linux-x64`, ~10.6 MB for type-plus itself | type-plus 8.0.0-beta.12 declares `typescript >= 5.4` as a required peer, and npm ≥ 7 installs peers automatically. standard-log and tersify also depend on type-plus. type-plus 8.0.0 makes the peer optional, which removes this cost (section 2). |
| `zod@3.25.76` | 5.1 MB, 1 package | option and config types |
| `find-installed-packages` | 18 packages: glob, rimraf, temp, minimatch… | `plugins list` builtin only, already lazy-imported |
| everything else | ~3 MB, ~10 packages | |

clibuilder itself unpacks to 1.7 MB, mainly because the CJS build bundles every dependency (`esbuild --bundle` with no externals). Those dependencies are also installed again as real packages.

**Design.**

- **Core `clibuilder@12` has one third-party runtime dependency, `@toon-format/toon`,** which the AXI-native output needs ([axi-native section 3.4](axi-native.md#34---format-is-not-first-class-6394)). Plugin loading moves out with discovery (section 9).
- **Options:** zod is replaced by **built-in type descriptors**, `t`, that convert argv strings. They live in `args-minus`, whose tokenizer replaces zod introspection. Option (c) below.
- **Validation:** any [Standard Schema](https://standardschema.dev) validator (zod ≥ 3.24, zod 4, valibot, arktype, …) is accepted in an option's `.check()` and as `config`.
- **Logging:** standard-log is replaced by a small built-in `UI` over injectable `stdout`/`stderr` streams, routed by one of two presets.
- **Small helpers:** inline them.
- **Plugins:** all plugin support (loading, keywords, the activation context, and the `plugins list` / `plugins search` builtins) moves to `@clibuilder/plugins`, attached through a new `use()` hook. The registry stays in core (section 9).
## 2. Inventory

Footprint numbers come from installing each dependency alone with `npm install --ignore-scripts` on 2026-10-06. "pkgs" counts the dependency itself plus its transitive dependencies.

| Dependency | Used in (`packages/clibuilder/src/…`) | Why | Hot path? | pkgs | node_modules | Plan |
|---|---|---|---|---|---|---|
| `zod` ^3.22 (3.25.76) | `zod.ts`, `cli.ts` (all public command types), `invocation/lookup.ts`, `render/help.ts`, `app/builder.ts` (`config` validation), `builtin/base_command.ts`, `render/format.ts`, `builtin/plugin_commands/search.ts` | option, argument and config types; argv conversion by introspection; help rendering | **yes**, every parse | 1 | 5.1 MB | **remove**: `t` descriptors, with Standard Schema in `.check()` and `config` (section 3) |
| `standard-log` 13.3.1 | `drivers/context.ts`, `drivers/logger.ts`, `drivers/context.mock.ts` (`standard-log/testing`), `testing/test_command.ts` | level filtering for `ui`, console reporter, capturing messages in `testCommand` | **yes**, imported at startup | 10 | 44 MB (via type-plus → typescript) | **remove**: built-in UI (section 4) |
| `standard-log-color` 13.3.1 | `drivers/context.ts` | colours clibuilder's own messages | yes | 14 | 45 MB (shares the above) | **remove**: `node:util` `styleText` |
| `type-plus` 8.0.0-beta.12 | `cli.ts`, `app/state.ts`, `app/builder.ts` (`RequiredPick`, `UnionOfValues`, `forEachKey`); `invocation/lookup.ts` (`findKey`, `reduceByKey`); `render/help.ts` (`reduceByKey`, `someKey`); `drivers/context.mock.ts` (`required`) | 2 utility types and 5 one-line object helpers | yes | 6 | 43 MB with beta.12 (peer `typescript`). type-plus 8.0.0 declares `typescript` as an optional peer (`peerDependenciesMeta.typescript.optional`) and unpacks to ~2.1 MB in 1358 files with one dependency (`unpartial`). | **remove**: inline them (~30 lines). The reason is breadth, not size: standard-log and tersify go anyway, and core needs only a few one-line helpers. 8.0.0 stays as a devDependency for `testType` in specs (section 5.1). |
| `tersify` 4.0.8 | `render/help.ts`: `toPrettyType` for the help `Config:` section | prints a zod object shape as a type literal | help only | 3 (acorn) | 1.4 MB | **remove**: the section is rebuilt from JSON Schema, or dropped (section 3.4) |
| `pad-right` 0.2.2 | `render/help.ts` | column alignment | help only | 2 | 40 KB | **remove**: `String.prototype.padEnd` |
| `wordwrap` 1.0.0 | `render/help.ts` | wraps command and alias lists at 80 columns | help only | 1 | 64 KB | **remove**: ~15-line internal wrap |
| `tmp` 0.2.7 | `drivers/context.mock.ts`, reached from `testing/test_command.ts` | temp cwd for `testCommand` | no, but **leaks into the main entry**: `index.ts` re-exports `testing/test_command.js` | 1 | 56 KB | **remove**: `fs.mkdtempSync(os.tmpdir())`. Export `testCommand` from `clibuilder/testing` only. |
| `tslib` ^2.5 | nowhere (no `importHelpers`; target ES2020) | none | no | 1 | 128 KB | **remove** (it is also listed in `devDependencies`) |
| `js-yaml` 4.x | `config.ts` | `.yaml` / `.yml` config files | only when a cli sets `config` | 2 | 1.2 MB | optional peer (section 5.2) |
| `jsonc-parser` 3.3.1 | `config.ts` | `.json` / `.jsonc` / `rc` config files with comments | only when a cli sets `config` | 1 | 256 KB | core, optional peer, or a tiny internal parser (open question Q4) |
| `import-meta-resolve` 4.2.0 | `drivers/resolve_plugin.ts` | resolves plugin specifiers from the project cwd using ESM rules (`import.meta.resolve(spec, parent)` is still flagged in Node) | only when `config.plugins` is set | 1 | 140 KB | move to `@clibuilder/plugins` with plugin loading (section 9) |
| `find-installed-packages` 4.0.1 | `builtin/plugin_commands/npm.ts` (lazy `import()`) | `plugins list` | no | **18** | 704 KB | move to `@clibuilder/plugins` |
| `search-packages` 2.2.3 | `builtin/plugin_commands/npm.ts` (lazy `import()`) | `plugins search` | no | 1 | 120 KB | move to `@clibuilder/plugins` |

The full install has no duplicate versions: type-plus, tersify and standard-log are each deduped to one copy. The cost is breadth, plus the peer `typescript` that type-plus 8.0.0-beta.12 required, not duplication. The standard-log rows above were measured with that beta; type-plus 8.0.0 no longer pulls in `typescript`.

Two side findings came out of the inventory:

- `parseConfig` (`app/builder.ts`) validates with `safeParse` but stores the **input**, not `r.data`. Defaults and transforms in a config schema are silently dropped. The redesign fixes this by using the validator's output.
- `cli.UsageError`'s `expect-single` variant carries `keyType: z.ZodType`. That puts a zod object on a public error type, which `@clibuilder/axi`'s usage handler receives. It becomes a kind string (section 3.4).

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
| **c** | **built-in descriptors that convert argv, plus `.check()` that accepts any Standard Schema** | 0 | yes, from the descriptor | owned by `args-minus` | mechanical rename (section 7) | **chosen** |
| **d** | keep zod 3 | 5 MB | yes | yes | none | v3 is in maintenance, and v4 users get type errors. This is the main complaint. |

### 3.4 Design (c)

The descriptor builders live in `packages/args-minus`, and clibuilder re-exports them as `t`. The published `args-minus` is only a placeholder, so its API is free to change.

```ts
import { t } from 'clibuilder'
import { z } from 'zod'

options: {
  format:  { type: t.enum(['toon', 'text', 'json']), default: 'toon', description: '…' },
  tag:     { type: t.array(t.string()), description: '…' },
  port:    { type: t.int({ min: 1, max: 65535 }), default: 8080, description: '…' },
  ratio:   { type: t.number({ min: 0, max: 1 }).optional(), description: '…' },
  release: { type: t.string<`v${number}`>({ pattern: /^v\d+$/ }), description: '…' },
  email:   { type: t.string().optional().check(z.email()), description: '…' },
  timeout: { type: t.custom(parseDuration).optional(), description: '…' },  // '1m30s' to milliseconds
  dry:     { type: t.boolean().optional(), description: '…' }   // also the default when `type` is omitted
}
```

**Builders.** Each kind takes its constraints in one options bag.

| Builder | Converts the raw string to | Constraint data |
|---|---|---|
| `t.string(opts?)` | the string | `pattern?: RegExp` |
| `t.string<T extends string>({ pattern })` | `T`, a template literal type | `pattern` |
| `t.number(opts?)` | a finite number | `min?`, `max?` |
| `t.int(opts?)` | an integer | `min?`, `max?` |
| `t.boolean()` | `true` when the flag is present; takes no value | none |
| `t.literal(value)` | one string, number or boolean literal | `value` |
| `t.enum([...])` | one string of a non-empty const tuple | `values` |
| `t.array(element)` | the repeated values, each converted by `element` | `element` |
| `t.custom(raw => value)` | whatever the function returns | `convert` |

- **Two chained methods only.** `.optional()` and `.check()` are the only methods on a descriptor. There is no `.min().max()` chain.
- **No string DSL.** An arktype-style string DSL was evaluated and rejected. Typing it needs a type-level string parser that costs more than the whole builder surface. The editor offers no completion inside the string, a regex inside it needs its escapes doubled, and help would need a runtime parser to read the constraints back out.
- **`t.int` is its own builder,** not an `int` flag on `t.number`, so the kind alone tells help and errors what is expected.
- **`t.string<T>({ pattern })` is an author assertion.** TypeScript cannot check a template literal type against a regex, so `T` is the author's claim about what the pattern admits.
- **`t.number` is strict.** An empty string, `NaN`, `Infinity` or trailing text fails as `invalid-value` (section 3.6).
- **`t.literal`** infers through a const type parameter, so `t.literal(true)` is `true`, not `boolean`. As a bare option, `t.literal(true)` is a flag that must be present; it is mostly useful as an array element.
- **`t.enum`** takes a non-empty const tuple of strings only. repobuddy's `z.union` of `z.literal`s becomes `t.enum`.
- **`t.array`** takes a non-optional scalar, `t.int`, literal or enum element. Optional elements, nested arrays and `t.custom` elements are rejected.
- **No `.describe()` or `.default()`.** `default`, `alias` and `description` stay on the option entry beside the descriptor. A `default` makes the key required in the `args` output type.

**Converting and validating are separate roles.**

- **The descriptor converts.** It turns the raw argv string into the typed value. It carries its constraints (`min`, `max`, `pattern`, `values`) as plain readable data, so help and usage errors can show them, for example `--port <int 1..65535>`. Ranges and patterns are the only built-in constraints, because they are declarative data that help can display.
- **`.check()` validates.** It runs on the converted value and never changes the value or its type. It takes one of:
  - a function of the value that returns `true` or nothing to pass, `false` to fail with a generic invalid-value message, or a string to fail with that string as the message;
  - any Standard Schema, run for pass or fail only. **The schema's output is ignored.** A `transform`, `trim`, `default` or coercion in it does nothing here. Conversion belongs in the descriptor or in `t.custom`.
- **Checks chain.** Several `.check()` calls run in order. On an array descriptor a check applies to the whole array; a check for each element goes on the element descriptor.
- **No built-in formats.** There is no email, URL or UUID kind. The author passes `z.email()`, a valibot pipe, an arktype type or a function to `.check()`.
- **No coercion.** argv values are strings and the descriptor converts them, so a coercing schema such as `z.coerce.number()` in `.check()` only ever sees a value that is already converted.

**`t.custom` and what belongs in the parser.** `t.custom(raw => value)` is the conversion hook for what the built-in kinds do not cover: a date, a URL, `1k` to `1000`, a duration. The function's return type is the option's type in `args`, and a throw becomes `invalid-value`.

A conversion belongs in the parser when all three hold:

1. it is a pure, synchronous function of the one raw string;
2. its failure is a usage error that the caller can fix;
3. its result should appear in the typed `args`.

Anything that reads a file, resolves a path against `cwd`, uses the network, depends on another option or is async belongs in `run()`, which throws a `CliError` on failure ([axi-native section 3.1](axi-native.md#31-errors-are-reported-twice-6391)).

A JSON option whose schema output matters, such as its defaults or transforms, goes through `t.custom`:

```ts
payload: { type: t.custom(raw => Payload.parse(JSON.parse(raw))), description: '…' }
```

**Not part of the design.** There is no option-level `schema:` field, no `refine` method and no `~standard` method on descriptors. No downstream CLI uses refinements, `z.object`, `z.coerce` or `.describe()` (section 7), and `.check()` covers validation without letting a schema change the value. A descriptor is a converter, not a Standard Schema.

**`config`.** It takes any Standard Schema, or none; there is no `t.object`. Validation uses `~standard.validate`, and the validator's **output** is stored, which fixes the dropped defaults and transforms bug (section 2). The help `Config:` section is generated from `~standard.jsonSchema` when the vendor implements it, and omitted otherwise. That removes `tersify`.

**Errors.** A failed conversion, constraint, check or `t.custom` call is reported as clibuilder's own `invalid-value` usage error. A check function's string is the author's message and is used as given. A foreign schema's issues, from `.check()` or from `config`, are mapped into the same error; following axi's rule, a dependency's text is never forwarded raw. The error's fields are in [axi-native section 3.3](axi-native.md#33-usage-errors-default-to-prose-plus-help-on-stderr-6393). `UsageError.keyType` becomes the descriptor's `kind` string instead of a zod object.

**Standard Schema types.** The Standard Schema v1 interface is vendored into `args-minus` (the spec explicitly allows copying), so there is no dependency for it. The copy is **verbatim** from `@standard-schema/spec` 1.1.0, including `PathSegment` in `Issue.path` (`PropertyKey | PathSegment`) and the `options` parameter of `validate`. A hand-trimmed copy rejects every real library.

**zod v3 and v4.** Both majors work in `.check()` and as `config`: zod ≥ 3.24 implements `~standard`, and zod 4 does natively. The `config` type is inferred through `~standard.types`, so clibuilder's typings import no zod type. CLIs that keep zod pick their own major.

**Introspection.** Help, structured help and usage errors read one form of each descriptor instead of its internals. The form is **public and read-only**, so other tools can build on `args-minus`. It is a flat union keyed on `kind`:

```ts
type Data = (
  | StringData | NumberData | IntData | BooleanData
  | LiteralData | EnumData | ArrayData | CustomData
) & { readonly isOptional: boolean; readonly checks: readonly Check[] }

type StringData  = { readonly kind: 'string'; readonly pattern?: RegExp }
type NumberData  = { readonly kind: 'number'; readonly min?: number; readonly max?: number }
type IntData     = { readonly kind: 'int'; readonly min?: number; readonly max?: number }
type BooleanData = { readonly kind: 'boolean' }
type LiteralData = { readonly kind: 'literal'; readonly value: string | number | boolean }
type EnumData    = { readonly kind: 'enum'; readonly values: readonly [string, ...string[]] }
type ArrayData   = { readonly kind: 'array'; readonly element: Data }
type CustomData  = { readonly kind: 'custom'; readonly convert: (raw: string) => unknown }
type Check       = { readonly type: 'fn' | 'schema' }
```

`default`, `alias` and `description` come from the option entry, not from this form. The exact field names are proposed from the prototype and are finalized in the implementation PR (section 10).

### 3.5 Implementation rules for `t`

A prototype of `t` in this repo settled these rules:

- **Inference stays exact** through `parseArgs<const O>(options: O)`. Option declarations written out of line, or spread from another object, infer too.
- **Optionality is a type-level flag,** separate from the output type. `.optional()` sets the flag; it does not widen the output to `T | undefined` inside the descriptor.
- **`t.enum` requires a non-empty const tuple.** A pre-widened `string[]` degrades to `string`. The implementation either rejects it at the type level or documents the degradation.
- **No `?: never` keys** to forbid an option that does not apply to a kind, such as `pattern` on `t.number`. They ruin completion and error messages. The excess-property check rejects such keys in an object literal. A bag passed in from a variable is not rejected, and that is accepted.
- **Definition-time checks throw.** `min <= max`, and integer bounds on `t.int`, are checked at runtime when the descriptor is created, because the type level cannot check them cheaply. The `T` of `t.string<T>` does not exist at runtime, so it stays an assertion.
- **A typed `default` is not converted.** It is already a value. `.check()` runs on it when the command is defined, so a bad default is a programmer error, not a usage error.
- **Array validation errors name the element value and its index,** for example `tag[2]`.
- **A foreign schema's issues** are mapped into the `invalid-value` usage error. The vendor's text is never forwarded raw.
- **`.check()` overloads** declare the Standard Schema overload first and the function overload last, so a type error reads about the function.
- **Measured cost.** About 1.9k type instantiations for 12 real option declarations from this repo, and about 4.1k for 60 options. Checking takes about 0.13 s to 0.18 s on TypeScript 6 and about 0.01 s on TypeScript 7. Nothing recurses. The vendors' own schema types cost more than the descriptors: one arktype call costs more than the whole 60-option surface.

**Schema compatibility for `.check()`.** A study of foreign-schema typing on TypeScript 6.0.3 and 7.0.2 (tsgo), with identical results, showed that bivariance does not let a schema with a wider input through: `S extends StandardSchemaV1<Out, any>` rejects zod 4's `z.coerce.number()`, whose input is `unknown`. `.check()` uses an explicit comparison instead:

```ts
type RefineCompatible<Out, S extends StandardSchemaV1> =
  [Out] extends [StandardSchemaV1.InferInput<S>] ? unknown
  : [StandardSchemaV1.InferInput<S>] extends [Out] ? unknown
  : { readonly '~refine': ['schema input', StandardSchemaV1.InferInput<S>, 'is unrelated to option value', Out] }

check<S extends StandardSchemaV1>(schema: S & RefineCompatible<Out, S>): Descriptor<K, Out, Opt>
check(fn: (value: Out) => boolean | string | void): Descriptor<K, Out, Opt>
```

A schema whose input is wider than the option value (`unknown`) or narrower (a literal union on a string option) is accepted. A disjoint input is a compile error with a readable message. The rule was verified against zod 3.25, zod 4.6, valibot 1.5 and arktype 2.2, including brands, transforms and optional chaining. The return type keeps `Out`, because a check never changes the type.

### 3.6 How other parsers convert and validate

Nine parsers were checked against their current source: commander 15, yargs 18, minimist 1.2.8, mri 1.2.0, cac 7, citty 0.2.2, clipanion 4 rc with typanion 3.14, @stricli/core 1.3, and `node:util` `parseArgs`.

- **Converting apart from validating.** Only yargs (`coerce`, then `choices` or `check`) and typanion's cascade keep the two apart, and neither enforces it. commander, stricli and cac use one function for both.
- **Standard Schema.** None supports it. stricli's docs tell users to wrap zod in its `parse` function.
- **Constraints.** Ranges and formats ship only in typanion, so leaving formats to the author is the norm. Choices, required and default are expected everywhere.
- **Numbers.** yargs' `number` silently yields `NaN`, minimist and mri keep the string, and stricli's `numberParser` accepts an empty string and `Infinity`. A strict `t.number()` that fails loudly is a differentiator.
- **Exit codes.** stricli is the only one with a usage-specific exit code (-4).

The gap the survey exposed was a custom converter, which `t.custom` fills.

## 4. Logging: standard-log and standard-log-color

**What it does today.**

- **clibuilder's own `ui`:** a standard-log logger at `info`, with a colour reporter. `--verbose`, `--silent` and `--debug-cli` raise or lower its level. Messages logged before the level is known are buffered and replayed (`createBuilderUI` / `dump`).
- **Per-command `this.ui`:** `createCommandUI(id)`, an `info`/`warn`/`error`/`debug` logger plus `showHelp`/`showVersion`, behind the `DisplayLevel` port in `core/ports.ts`.
- **`testCommand`:** captures messages through `standard-log/testing`'s in-memory reporter.

**Usage downstream.** No consumer imports standard-log. They use `this.ui.info` and `this.ui.showHelp` only. One spec (repobuddy/buddy `check_dependencies_command.spec.ts`) asserts on `testCommand`'s `messages`.

**Design.** standard-log and standard-log-color are removed. The `UI` port in `core/ports.ts` already is the interface; core implements it directly:

```ts
type Streams = { stdout: Writable; stderr: Writable }   // injectable; process.stdout/stderr by default
```

- **Levels:** a ~20-line threshold over `DisplayLevel` (`none` / `info` / `debug` / `trace`). The pre-level buffer stays as is.
- **Colour:** `util.styleText` (Node ≥ 20.12; `engines` is already ≥ 20.19), gated on `stream.isTTY` and `NO_COLOR` / `FORCE_COLOR`.
- **`cli({ streams })`:** lets embedders and tests capture output. This is the stricli/clipanion model. EPIPE is handled in the same stdout driver ([axi-native section 3.9](axi-native.md#39-epipe-6399)).
- **`testCommand`:** passes in-memory streams and keeps returning `messages` (one entry per line, as today), so the one asserting spec keeps working.
- **`showHelp` and `showVersion` leave `ui`.** Core owns `--help` and `--version` as answers on stdout.
- **Bridge:** anyone who wants standard-log, pino and so on wraps it in a `UI`. No adapter ships in core.

**Routing presets.** With explicit streams, where output goes is a routing table, not a reporter config. `cli({ output })` picks one of two permanent presets ([axi-native section 3.10](axi-native.md#310-output-modes-and-stream-routing)):

| Output | `output: 'axi'` (default) | `output: 'console'` |
|---|---|---|
| returned result, `--help`, `--version` | stdout | stdout (returned values are not printed) |
| thrown `CliError`, usage error | stdout, encoded | stderr, prose |
| `ui.info`, `ui.debug` | stderr | stdout |
| `ui.warn`, `ui.error` | stderr | stderr |

`console` keeps today's mapping from standard-log's console reporter: `info` and `debug` on stdout (`console.debug` is an alias of `console.log` in Node), `warn` and `error` on stderr. `trace` is a log level that `--debug-cli` raises, not a `ui` method. The level-to-stream map is internal in v12; a CLI picks a preset with `cli({ output })`. Removing standard-log is the prerequisite that makes this routing cheap.

## 5. The rest

### 5.1 Trivial removals (no API change)

| Remove | Replacement |
|---|---|
| `pad-right` | `padEnd` |
| `wordwrap` | internal `wrap(text, 80)` |
| `tslib` | nothing |
| `tmp` | `mkdtempSync` |
| `type-plus` | ~30 lines of local helpers and types (`RequiredPick`, `UnionOfValues`, `forEachKey`, `findKey`, `reduceByKey`, `someKey`, `required`). `args-minus` stays zero-dependency and inlines the one helper it needs (`Simplify`, one line). type-plus 8.0.0 remains a devDependency for `testType` in specs, bumped from 8.0.0-beta.12. |
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

> **Superseded by section 9.** Loading moves out of core too. The text below is the original proposal.

- **Loading** (`config.plugins` → `import()` → `activate`): needs only `import-meta-resolve` (0 deps, 140 KB). repobuddy/buddy treats `config: true` plugin loading as load-bearing. **Keep loading in core**, with `import-meta-resolve` as core's single dependency. Alternatively, move it out with discovery (Q3).
- **Discovery** (`plugins list` / `plugins search` builtins): ships as a new `@clibuilder/plugins` package that owns `find-installed-packages` (18 packages) and `search-packages`. A CLI opts in with `.command(pluginsCommand)` or equivalent. Without it, core no longer injects the `plugins` group automatically when `config` or `keywords` is set.

### 5.4 Build output

`engines` is already `>= 20.19`, where `require(esm)` works unflagged. Dropping the CJS bundle in v12 roughly halves the published package and removes the double-shipping of bundled dependencies (Q6).

### 5.5 Target dependency set

| Package | `dependencies` | optional `peerDependencies` | install (est.) |
|---|---|---|---|
| `clibuilder@12` | `@toon-format/toon` (0 deps, ~120 KB), `args-minus` (in-house, 0 deps) | `js-yaml`, (`jsonc-parser` under Q4) | **3 packages, ~0.6 MB**, down from 43 packages and ~54 MB |
| `@clibuilder/plugins` (new) | `import-meta-resolve`, `find-installed-packages`, `search-packages` | `clibuilder ^12` | opt-in |
| `@clibuilder/axi` | none | `clibuilder ^12` | smaller: only the value helpers remain ([axi-native section 4](axi-native.md#4-what-moves-in-one-table)) |

`@toon-format/toon` is core's single third-party dependency. The AXI-native output encodes every toon value with it ([axi-native section 3.4](axi-native.md#34---format-is-not-first-class-6394)), the same choice the reference axi-sdk-js makes. It replaces a hand-rolled encoder, which could disagree with the spec.

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
| cyber-mux | ~50; also annotates `z.ZodOptional<z.ZodEnum<…>>`; reads `command.options` | none | `activate` | **high**, but mechanical |
| agent-harness | ~17 | none | own discovery | med |
| buddy-agent-harness | ~22; a test reads `options.format.default` | none | none | med |
| repobuddy/buddy | 3 (`.optional()` chain) | `ui.info`; one spec asserts `messages`; `testCommand` from the root entry | **`config: true` is load-bearing** for plugin loading | med |
| repobuddy/typescript | 3 (`z.union` of literals) | `ui.info`; `testCommand` from `clibuilder/testing` | `activate` | low |
| cyber-sdd | 0 | `showHelp` (leaves `ui`) | none | low |
| `@clibuilder/axi` (in repo) | `format.ts`, `truncate.ts` | uses `cli.UsageError` (`keyType` changes); its output, error, format and usage modules move into core | none | low; release in lockstep |

### Migration path

1. **v11 minor (non-breaking prep).**
   - Land the descriptor work in `args-minus` first: the `t` builders and their constraints, `.check()`, `t.custom`, the introspection form, and the vendored Standard Schema interface.
   - Then re-export `t` from clibuilder, move its parser onto the `args-minus` tokenizer, and accept a Standard Schema as `config`. The zod path stays alongside through the v11 minors.
   - Add `cli({ streams })` with the two routing presets, `output: 'console'` as the v11 default ([axi-native section 6](axi-native.md#6-sequencing)).
   - Add the `use()` hook and publish `@clibuilder/plugins` against it, so a CLI can switch to `.use(plugins())` before v12 (section 9.6).
   - Mark the `z` re-export and the root `testCommand` export `@deprecated`.
   - Fix the `parseConfig` output bug.
   - Users can migrate at their own pace and get v4-compatible validation early.
2. **Codemod.** `z.<kind>(` → `t.<kind>(` for the supported kinds, `z.number().int()` → `t.int()`, `.min(a).max(b)` → `{ min: a, max: b }`, `.regex(r)` → `{ pattern: r }`, `z.literal(x)` → `t.literal(x)`, `z.union` of string `z.literal`s → `t.enum`, `z.optional(x)` → `x.optional()`, and `import { z } from 'clibuilder'` → `import { t } from 'clibuilder'`. Anything outside the supported subset is flagged rather than rewritten. Type annotations such as cyber-mux's `z.ZodOptional<…>` become `t.Optional<…>` or are dropped in favour of `satisfies`.
3. **v12 major.**
   - Remove the zod path, and zod, standard-log, standard-log-color, type-plus, tersify, pad-right, wordwrap, tmp and tslib.
   - Make `js-yaml` an optional peer.
   - Remove plugin loading, `keywords` and the automatic `plugins` group from core (section 9).
   - Optionally drop CJS.
   - Add `@toon-format/toon` as a dependency, if the v11 `--format` step has not already.
   - Ship together with the #639 breaks so users take one major, not two.
4. **Release `@clibuilder/axi`**, reduced to its value helpers, with peer `clibuilder ^12` in the same release train.

## 8. Open questions

1. ~~**Descriptor naming.** `t`, `arg`, or keep the name `z` as a compatible subset?~~ **Resolved:** `t`, plus the codemod (section 3.4).
2. ~~**Bare Standard Schema as `type`.** Allowed, with shape from `~standard.jsonSchema`, or must shape always come from a descriptor?~~ **Resolved:** shape always comes from a descriptor; a foreign schema is accepted only in `.check()` and as `config` (section 3.4).
3. ~~**Plugin loading.** Should it stay in core, keeping `import-meta-resolve`, or move entirely to `@clibuilder/plugins` for a zero-dependency core?~~ **Resolved by section 9:** it moves out.
4. **JSONC.** Keep `jsonc-parser`, make it an optional peer, or use an internal stripper? YAML as an optional peer: acceptable friction for CLIs whose users write YAML config?
5. ~~**`ui.info` routing under #639.** stdout or stderr, once a result channel owns stdout?~~ **Resolved:** stderr in `output: 'axi'` mode, stdout in `output: 'console'` mode (section 4). The same question as axi-native Q5.
6. **Drop the CJS build in v12?** `engines >= 20.19` already guarantees `require(esm)`.
7. ~~**toon in core.** Does `@toon-format/toon` become a core dependency, or does core hand-roll toon or expose only a formatter hook?~~ **Resolved:** `@toon-format/toon` is core's single third-party dependency, used for all toon output (section 5.5).
8. ~~**`args-minus`.** Should core's argv tokenizer move onto `args-minus` as part of the same rewrite of `invocation/lookup.ts`?~~ **Resolved:** yes, and `t` lives in `args-minus` (section 3.4).

Questions added by the 2026-10-11 decisions are in section 10.

## 9. Amendment: move all plugin support out of core

*Added 2026-10-10. Supersedes section 5.3 and resolves Q3.*

Section 5.3 moved only discovery out of core and kept loading in, because repobuddy/buddy relies on `config: true` loading plugins. This amendment moves loading out as well. repobuddy/buddy still works after adding one call.

### 9.1 Why

- **Concept cost, not only install cost.** Today, setting `config` or `keywords` turns on plugin loading and adds a `plugins` command group without the CLI author asking for either. Someone comparing clibuilder with commander or citty meets a plugin system before their first command runs. Core should be the parser, help, config and `run()`, and nothing that is not asked for.
- **Plugins are tied to config only because of where the list is stored.** A CLI cannot have plugins without a config file, and core reserves a `plugins` key inside the user's own config schema. Moving plugins out lets the plugin list come from other places (section 9.6). Config then goes back to being the user's data.
- **Plugin needs change at their own pace.** Discovery modes, trust rules and activation options can change in `@clibuilder/plugins` without a core major.
- **Fewer dependencies.** `import-meta-resolve` leaves core, so `clibuilder@12` installs only `@toon-format/toon` and the in-house `args-minus` (section 5.5).

### 9.2 What moves and what stays

| Piece | Today (`packages/clibuilder/src/…`) | v12 |
|---|---|---|
| Loading: resolve, import, activate (`loadPlugins`) | `plugins/load.ts`, `drivers/resolve_plugin.ts`, `drivers/context.ts` | `@clibuilder/plugins` |
| `PluginActivationContext` type | `cli.ts` | `@clibuilder/plugins`. Core keeps a deprecated copy for v12 (section 9.5) |
| `keywords` option, and its default of `name` when `config` is set | `cli.ts`, `app/state.ts` | becomes an option of `plugins()` |
| `this.keywords` on the run context | `cli.ts` | removed. The `plugins` command reads its keywords from the extension's options |
| Automatic `plugins` group when `config` or `keywords` is set | `app/builder.ts` | removed. `plugins()` adds the group unless told not to |
| `plugins list` / `plugins search` | `builtin/plugin_commands/` | `@clibuilder/plugins` |
| The `plugins` key in config | read by `app/builder.ts` | read by `plugins()` through `resolveConfig`. Core no longer reserves it |
| Registry: `createRegistry`, `defineKey`, `defineCollectionKey`, `this.registry` | `plugins/registry.ts` | **stays in core** |
| Config resolution (`resolveConfig`, `lookupConfig`, …) | `config.ts` | stays in core |

The registry stays because it is not specific to plugins. It is how any extension shares values with the host's commands. It has no dependencies and is about 70 lines. Keeping it in core means `this.registry` keeps working, and `@clibuilder/axi` or any other extension can use it too.

### 9.3 Core's new hook: `use()`

Core gains one general hook that adds commands and registry entries before `parse()` picks the command to run:

```ts
type Extension = (context: ExtensionContext) => void | Promise<void>

type ExtensionContext = {
  readonly host: { readonly name: string; readonly version: string }
  readonly cwd: string
  readonly ui: UI
  readonly registry: RegistryOwner
  addCommand(command: cli.Command): void
  /** The cli's config and where it came from; `source.type` is 'none' when the cli sets no `config`. */
  resolveConfig(): Promise<ConfigLoadResult>
}

cli({ name: 'my-cli', version: '1.0.0' })
  .use(extension)
  .parse(process.argv)
```

- Extensions run in the order `.use()` was called. Each one is awaited before the next starts, so the command order is the same on every run. This is the same rule `loadPlugins` follows today.
- Commands added by extensions come after the host's own `.command()` and `.default()` commands.
- `.use()` makes `.parse()` available with no commands of its own, as `config` and `keywords` do today, because an extension may supply all of them.
- `--version` returns before any extension runs. This is the fast path #639 asks for (item 8). `--help` waits for extensions, because it has to list their commands.

The hook is not plugin-specific. It is also the natural seam for lazy commands.

### 9.4 `@clibuilder/plugins`

```ts
import { cli } from 'clibuilder'
import { plugins } from '@clibuilder/plugins'

cli({ name: 'my-cli', version: '1.0.0', config: true })
  .use(plugins({ keywords: ['my-cli-plugin'] }))
  .parse(process.argv)
```

| Option | Default | Meaning |
|---|---|---|
| `keywords` | `[host.name]`, matching today's default (Q9.1) | the npm keywords `plugins list` and `plugins search` look for, and that the `dependencies` source matches |
| `include` | `[]` | plugin packages the CLI author ships with the CLI (section 9.6) |
| `dependencies` | `false` | load the project's direct dependencies that carry a keyword (section 9.6) |
| `config` | `true` | read the `plugins` key from the cli's resolved config |
| `command` | `true` | add the `plugins list` / `plugins search` group |

Dependencies are `import-meta-resolve`, `find-installed-packages` and `search-packages`, with `clibuilder ^12` as a peer. The two discovery packages are still imported lazily, so a CLI that never runs `plugins list` or `plugins search` never loads them.

Exports: `plugins`, `PluginActivationContext`, `loadPlugins` (for hosts that build their own loading), and `pluginsCommand` (for hosts that want the command group without loading).

### 9.5 The plugin author's side

`activate(context)` and `PluginActivationContext` keep exactly their current shape: `addCommand`, `register`, `get`, `has` and `host`. A plugin built for clibuilder 11 loads unchanged under `@clibuilder/plugins`.

Only the type's import path moves. A plugin imports it from `@clibuilder/plugins`, as a type-only dev dependency. So that existing plugins compile without changes during v12, core keeps a structural copy of the type, marked `@deprecated`, and removes it in v13. The copy has no runtime cost, and the registry types it refers to stay in core anyway.

### 9.6 Plugin sources beyond config

Moving plugins out of core is also the chance to remove the main friction: today, installing a plugin does nothing until the user also edits a config file. `plugins()` combines up to three sources:

1. **`include`: plugins the CLI author ships.** These are listed in code and installed as the CLI's own dependencies. No user config is needed. This is the main case for CLIs assembled from plugin packages. It adds no trust risk, because the author already chose those dependencies.
2. **`dependencies`: opt-in loading of the project's direct dependencies.** `plugins()` reads the nearest `package.json` and checks the packages listed under `dependencies` and `devDependencies`. It loads those carrying any of `keywords`. Packages pulled in by other packages are never checked, which keeps the rule that a package does not add commands unless someone chose to install it. The cost is one `package.json` read per direct dependency, not a scan of `node_modules`.
3. **`config`: the `plugins` key, as today.** It can add plugins, exclude one from the other sources with a `!` prefix (`"!my-cli-plugin-git"`), and set the order.

Plugins load in the order `include`, then `dependencies` (in `package.json` order), then config. A package named by more than one source loads once, at its first position. Config can reorder by naming packages explicitly.

Trade-offs of `dependencies`:

- A direct dependency that adds the keyword in a later version starts adding commands without the user doing anything. This is why the source is opt-in.
- Under Yarn PnP, reading a dependency's `package.json` needs PnP-aware resolution. That is the same gap as #575 (`plugins list` finds nothing under Yarn PnP), and one resolver should fix both.

### 9.7 Downstream impact

Surveyed under `~/code` on 2026-10-10. No dependent uses `this.registry`, `this.keywords`, `defineKey` or `defineCollectionKey`.

| Package | Uses | Change |
|---|---|---|
| repobuddy/buddy | `config: true` loads its plugins | add `@clibuilder/plugins` and `.use(plugins())` |
| repobuddy/typescript | `import type { PluginActivationContext } from 'clibuilder'` | none in v12 (deprecated copy). Change the import path before v13 |
| cyber-mux | `import type { PluginActivationContext } from 'clibuilder'` | same as repobuddy/typescript |
| others in section 7 | no plugin use | none |

### 9.8 Migration

- **v11 minor.** Add `use()`. Publish `@clibuilder/plugins` with a peer range of `clibuilder ^11.<that minor> || ^12`. When a `plugins()` extension is present, core skips its own config-driven loading and its automatic `plugins` group, so nothing loads twice. A CLI can switch early.
- **v12.** Remove core's loading, `keywords`, `this.keywords` and the automatic `plugins` group. A CLI that sets `config` and has a `plugins` key in its config, but no `plugins()` extension, gets a one-time warning naming `@clibuilder/plugins`. Without it, the plugins would silently stop loading.
- **v13.** Remove the deprecated `PluginActivationContext` copy from core.

### 9.9 Open questions

1. **Default keyword.** Keep `[host.name]` to match today, or default to `` `${host.name}-plugin` ``, the convention the plugins guide recommends? The second is better on npm, but it changes which packages a CLI's existing `plugins search` finds.
2. **`dependencies` in the first release?** It could ship in the first version of `@clibuilder/plugins`, or follow once #575's resolver exists. `include` has no such dependency.
3. **Name collisions.** Today a host command and a plugin command with the same name are resolved silently by load order. Should `use()` warn, as the registry does for a value key that is already owned?

## 10. Still open

Items raised by the 2026-10-11 decisions. Q4, Q6 (section 8) and section 9.9 are also still open.

1. ~~**Name of the `quiet()` opt-out.**~~ **Resolved:** there is no opt-out wrapper; `result(value, { render })` controls the printed form ([axi-native section 3.5](axi-native.md#35-no-result-channel-6395)).
2. ~~**Descriptor introspection form.** What does help read instead of descriptor internals?~~ **Resolved:** a public, read-only `Data` union keyed on `kind`, with `isOptional` and `checks` (section 3.4). Its exact field names are item 7.
3. ~~**Untested `t` typing.** Foreign-schema typing and TS 7 (tsgo).~~ **Resolved:** tested on TS 6.0.3 and 7.0.2 with identical results; bivariance does not admit a wider input, and `.check()` uses an explicit input comparison (section 3.5).
4. ~~**Is `cli({ routing })` public in v12?**~~ **Resolved:** no, routing is internal in v12 (section 4).
5. ~~**May a schema change the option's type?**~~ **Resolved:** no. `.check()` only validates; a schema's output is ignored, and conversion belongs to the descriptor or `t.custom` (section 3.4).
6. ~~**Where does string coercion live?**~~ **Resolved:** in the descriptor. argv values are strings, so there is no coercion step, and `z.coerce` in `.check()` only sees a converted value (section 3.4).

Still open:

7. **Exact introspection field names.** The names in section 3.4 come from the prototype and are finalized in the implementation PR. That the form is public and read-only is decided.
8. **A built-in `t.json(schema)`.** `t.custom(raw => schema.parse(JSON.parse(raw)))` covers it today. A helper would also need to decide how a schema's output type and issues map to `args` and `invalid-value`.
9. **`t.custom` as an array element.** Rejected in v12. Allowing it later needs a rule for reporting which element's conversion threw.
10. **Async Standard Schema in `.check()`.** A vendor's `validate` may return a promise. Whether `.check()` awaits it or rejects an async schema is not decided; `t.custom` is synchronous either way.
11. **Type-check cost on a CLI with many commands.** The cost in section 3.5 was measured for one set of options. A CLI with many commands, each with its own options, has not been measured.
