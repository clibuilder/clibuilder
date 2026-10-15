# Change Log

## 12.1.0

### Minor Changes

- 8955060: Add `ref()` and `placeholder()`: a `help` line that names another command, rendered as a complete command line. Under `cli()` it reads `<name> task get --gid 1` and is checked against the command tree. Under `runScript()` it renders as the sibling script, `pnpm exec <bin>` or a pinned `npx`, from the command map `universal-plugin plugin build` embeds. By default a ref is a plain `help` string, so the output keeps the AXI shape. `cli({ refs: 'next' })` and `runScript({ refs: 'next' })` encode refs as `next[N]{run,why}` instead. `CliError` keeps refs in `help`.
- d7f37b3: `runScript()` accepts positional `arguments` and `conflicts`, and reports a bad invocation as `cli({ output: 'axi' })` does:
  the top-ranked usage error alone, with its code (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`), `details` and `help`, and exit 2.
  It shares `cli()`'s argument lookup instead of reporting code `usage` (#706).
  A test runs one command through `cli().command()` and `runScript()` and checks that the answers, `CliError` reports and usage errors match.

### Patch Changes

- 60459d7: Accept option descriptors from another copy of `args-minus` in the same process.
  `isDescriptor()` now checks a `Symbol.for('args-minus.descriptor')` brand that carries the descriptor format version, instead of prototype identity,
  so a CLI that bundles clibuilder no longer rejects the commands of plugins built against their own `args-minus` (#711).
- 885dd71: Update the README for the published 12.0.0: `@clibuilder/axi` is deprecated on npm, and plugin support comes from `@clibuilder/plugins`.
- Updated dependencies [60459d7]
  - args-minus@0.2.1

## 12.0.0

### Major Changes

- 0e61d44: Plugin support moved out of core into [`@clibuilder/plugins`](https://www.npmjs.com/package/@clibuilder/plugins). Upgrading from 11.5.0:
  
  - Config loads the config for your commands only. It no longer loads the plugins named by the config's `plugins` key. Config itself moved to `.use(config())` from `clibuilder/config` (see the config entry).
  - The `keywords` option of `cli()` and `this.keywords` in `run()` are removed. Pass them to `plugins({ keywords })` instead, which defaults to the CLI's name as before.
  - The `plugins list` / `plugins search` group is no longer added when `config` or `keywords` is set. `plugins()` adds it.
  - `import-meta-resolve`, `find-installed-packages` and `search-packages` are no longer dependencies of `clibuilder`.
  
  Migration:
  
  ```diff
  + import { config } from 'clibuilder/config'
  + import { plugins } from '@clibuilder/plugins'
  
  - cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })
  + cli({ name: 'my-cli', version: '1.0.0' })
  +   .use(config())
  +   .use(plugins({ keywords: ['my-cli-plugin'] }))
  ```
  
  A CLI whose config lists `plugins` but that loads none (no extension reads the config) warns once, naming `@clibuilder/plugins`, so plugins do not stop loading silently. For example, repobuddy/buddy relies on `cli({ config: true })` loading plugins and needs `.use(config())` and `.use(plugins())`.
  
  Unchanged: the registry (`defineKey`, `defineCollectionKey`, `this.registry`) and `mockPluginContext` from `clibuilder/testing`. A plugin's `activate(context)` gets the same context as in 11. `import type { PluginActivationContext } from 'clibuilder'` still compiles but is deprecated: import it from `@clibuilder/plugins`. The copy in `clibuilder` is removed in 13.
- af37209: Config loading moved behind `.use(config())` from the new `clibuilder/config` subpath ([#692](https://github.com/clibuilder/clibuilder/issues/692)). A CLI without it contains no config loader, no find-up and no parsers. Upgrading from 11.5.0:
  
  | Before | After |
  | --- | --- |
  | `cli({ name, version, config: true })` | `cli({ name, version }).use(config())` |
  | `cli({ ..., config: 'other' })` | `cli({ ... }).use(config({ name: 'other' }))` |
  | `import { resolveConfig } from 'clibuilder'` | `import { resolveConfig } from 'clibuilder/config'` |
  
  - The `config` option of `cli()` is removed.
  - `lookupConfig`, `resolveConfig`, `loadConfig`, `readConfigFile`, `getConfigFilenames`, `getConfigFormat`, `describeConfigSource` and the types `ConfigFormat`, `ConfigLoadResult`, `ConfigLookupResult` and `ConfigSource` are exported from `clibuilder/config` only.
  - `.use(config())` adds `--show-config`, validates each command's `config` schema before `run()`, and gives `run()` the config as `this.config`. The output and the `invalid-config` errors are the same as in 11.
  - A command that declares `config` must come after `.use(config())`: otherwise it is a type error. A command the type check cannot see, such as a sub-command, fails at runtime with an error naming `clibuilder/config`. In 11 such a command loaded the config by the CLI's name without `cli({ config })`.
  - The config is resolved on the first `parse()`, not when `cli()` is called.
  - With `@clibuilder/plugins`, add `.use(config())` before `.use(plugins())`: `plugins()` reads the `plugins` key from the config `config()` resolved.
  
  `cli().use()` extensions can now do what `config()` does. `ExtensionContext` adds `shared`, values shared between extensions keyed by `defineKey()`, `addGlobalOption(name, entry, answer)` and `beforeRun(hook)`. `resolveConfig()` returns the config `config()` resolved. Extensions now run before the global options are resolved, and what they log is held until the logging flags apply.
  
  `@clibuilder/codemod` replaces `cli({ config })` with `.use(config())`, adds the `clibuilder/config` import, and moves the config functions and types from `clibuilder` to `clibuilder/config`. A `config` value it cannot read is flagged with a `TODO(clibuilder-12)` comment.
- 8194d17: Make `cli({ output: 'axi' })` the default, so stdout carries only answers. `cli({ output: 'console' })` is the permanent opt-out, with the 11.5.0 output.
  
  Coming from 11.5.0, a CLI that does not set `output` changes like this:
  
  - **A value `run()` returns is printed** once on stdout, encoded in `this.format`, with nothing on stderr. `parse()` still resolves to the value. An object is encoded in the format, an array or a scalar under the `result` key (such as `result[2]: a,b`), and a string is written verbatim. New helpers control the printed form: `result(value, { help, render })` adds next-step lines as a `help` list and per-format renderers, `document(content)` writes the content exactly as given, and `empty(message, { help })` is a success with an explicit empty state. Migration: return `undefined` when nothing should print, wrap the value in one of these helpers, or set `output: 'console'`. `npx @clibuilder/codemod src` lists every `return <expr>` in a `run()` for review (add `--dry-run` to preview it).
  - **Every `ui` call is a diagnostic on stderr**, `ui.info` and `ui.debug` included. Migration: return the answer instead of logging it, or set `output: 'console'`.
  - **A thrown `CliError` is reported once on stdout**, encoded as `error`, `code`, the `details` fields and `help`, and nothing is written to stderr for it.
  - **A usage error is reported as the top-ranked one, coded, on stdout**, with exit code 2 and no help after it. The ranking is unknown option, conflicting options, invalid value, expect single, missing argument, extra arguments. The report holds `error`, `code` (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`), the offending `option` or `argument`, the `value` as typed, and `help`: the usage line and, where it fixes the mistake, the valid options, arguments or commands. An `invalid-value` error adds the allowed values of a `t.enum` or `--format`, or the constraint of a `t` declaration such as `int 1..65535`. A command group invoked without a sub-command is code `missing-command`, listing its sub-commands, exit code 2. A config that fails the command's schema is code `invalid-config`, with the messages for each failing key, exit code 1. `cli({ onUsageError })` and a command's own `onUsageError` still take over.
  - **`--help` is an answer on stdout that follows `--format`**: the structured help under `toon` and `json`, the text help under `text`. `--version` is plain text on stdout, alone or after a command.
  - **The global `--format <toon|json|text>` is declared in every CLI**, in both output modes. Help lists it once with the global options, it has no `-f` alias, and `this.format` is the caller's `--format`, else `cli({ format })`, else `toon`. A bad value such as `--format yaml` is an `invalid-value` usage error listing the allowed formats, reported in the CLI's default format. A command that declares its own `format` option, including `formatOption` and `defineFormatOption()` from `@clibuilder/axi`, fails the CLI at startup. Migration: delete the local option and read `this.format`.
  - **`run()` reads the output mode as `this.output`**, `'axi'` by default.
  - **`testCommand` follows the default.** Its `messages` include the printed answer. It takes a fourth argument, `{ output }`, to test a CLI in `output: 'console'`: `testCommand(cmd, 'cmd', undefined, { output: 'console' })`.
  
  `cli({ output: 'console' })` keeps the 11.5.0 output byte for byte, except that the help lists the global `--format`. A spec runs the same invocations against 11.5.0 and against 12 to hold it to that.
  
  `ui.showHelp()` and `ui.showVersion()` stay on `ui` in 12 and are deprecated. Called from `run()` in `axi` output they answer like `--help` and `--version`, in `this.format`. Anywhere else, and in `console` output, they write the text help and the version on stdout, as in 11. They are removed in a later major. Migration: return the help or version from `run()` with `document()` or `result()`.
- ecb0db4: `clibuilder` 12 is ESM-only: the CommonJS build in `cjs/` is gone.
  
  - `require('clibuilder')`, `require('clibuilder/axi')`, `require('clibuilder/testing')` and `require('clibuilder/compile-cache')` still work on Node.js 20.19 and later, the `engines` floor, through `require(esm)`.
  - The `exports` shape changed: every entry point is `{ types, default }` pointing at `esm/`, with no `import` or `require` condition, and the top-level `main` field is removed. `types` stays for older resolvers.
  - TypeScript reports error TS1479 (an ES module cannot be imported with `require`) in a CommonJS file compiled with `module: node16`, or with `module: nodenext` before TypeScript 5.8. The declarations were already ESM in 11.x, so this is not new, but it now matches what Node does. *Migrate:* use TypeScript 5.8 or later with `module: nodenext`. `module: commonjs` with `moduleResolution: node10` still resolves the root entry through the top-level `types` field.
  - Jest's CommonJS runtime cannot load ES modules. *Migrate:* run Jest with ESM support, or move to a test runner that loads ES modules, such as Vitest or `node --test`.
- fe84abc: Remove standard-log and standard-log-color. Every CLI now writes through a built-in UI over the new `cli({ streams })` option, which takes the `stdout` and `stderr` to write to, `process.stdout` and `process.stderr` by default. `--verbose`, `--silent` and `--debug-cli` work as before, and `testCommand()` still returns `messages`, one line per message.
  
  With `output: 'console'`, `info` and `debug` still go to stdout and `warn` and `error` to stderr. Two things change from 11.5.0 in every output:
  
  - **Colour only on a terminal.** `error` is red and `warn` is yellow only on a stream that is a TTY, following `NO_COLOR` and `FORCE_COLOR`. In 11.5.0 standard-log-color wrapped clibuilder's own `error` and `warn` text in colour codes even when stderr was a pipe or a file. Migration: if a script or test matched those escape codes, match the plain text.
  - **No `clibuilder` prefix.** clibuilder's own messages, such as the ones `--debug-cli` shows, no longer start with `clibuilder`. Migration: match the message without the prefix.
  
  When the reader of stdout closes early, as in `cli | head -1`, the CLI now drops the rest of its output and exits 0 instead of crashing on `EPIPE`.
  
  Also removed from `dependencies`: `pad-right`, `wordwrap`, `tmp` and `tslib`. Help text is unchanged.
- 18b7725: Remove zod. `t` is the only way to declare an argument or option `type`, and `config` takes any Standard Schema, or none.
  
  - **`z` is removed**, with `isZodArray`, `isZodBoolean`, `isZodEnum`, `isZodNumber`, `isZodObject`, `isZodOptional` and `isZodString`. Migration: `import { t } from 'clibuilder'` and declare types with `t`: `z.optional(z.number())` becomes `t.number().optional()`. `npx @clibuilder/codemod src` rewrites the supported calls (add `--dry-run` to preview the diff).
  - **A zod 3 `config` from `z` is gone.** Migration: import your schema library yourself (`import { z } from 'zod'`); zod 3.24 or later, zod 4, valibot and arktype all work. Help builds the `Config:` section from the schema's JSON Schema only, so a zod 3 config, which has none, no longer shows one.
  - **A boolean option takes no value after it.** `--dry false` leaves `false` as a positional, for an option declared without a `type` too and for `--verbose`, `--help` and the other global flags. Migration: write `--dry=false`.
  - **An array option takes one value per occurrence.** Migration: write `--tag a --tag b` instead of `--tag a b`.
  - **An option that is neither `.optional()` nor given a `default` must be passed.** zod typed it as present but did not enforce it. Migration: add `.optional()` where the option may be left out.
  - **A single-valued option given twice gets no value**, beside its `expect-single` usage error. zod also used the last value.
  - **`z.coerce`, `.transform()` and `.default()` in an option type have no equivalent.** Migration: convert with `t.custom(raw => value)`, put the default in the option's `default`, and validate with `.check()`.
  - **`cli.UsageError`'s `keyType` is removed.** Migration: read `keyKind`, the kind string. Usage error messages use the `args-minus` wording, such as `expected a number`.
  - **Help hints use the `t` form**: `[--name <string>]` and `<file: string>` instead of `[--name=string]` and `<file=string>`, and a string default is quoted, including the global `--format`'s.
  - **`js-yaml` is an optional peer dependency**, loaded only when a `.yaml` or `.yml` config file is read. Without it, reading one fails with a `CliError` whose code is `missing-peer-dependency`. Migration: a CLI whose users write YAML config runs `npm install js-yaml`.
  
  `zod`, `type-plus`, `tersify` and `js-yaml` leave `dependencies`. With standard-log also gone, a clean install of `clibuilder` drops from 41 packages (19 MB) in 11.5.0 to 3 (1.2 MB), and the packed tarball from 396 KB to 108.9 kB.
- 1d2d7a3: `--show-config` is an answer on stdout in `output: 'axi'`, the default, instead of `ui.info` lines on stderr. It follows `--format`: `toon` and `json` encode `source` (`file`, `package.json` or `none`), `path`, `property` for a `package.json` source, and `config`; `text` prints the lines 11.5.0 printed. It writes nothing to stderr and exits 0. In `output: 'console'` it is unchanged.
  
  Coming from 11.5.0, the default output of `--show-config` is now `toon`, not the `config: <path>` line and the JSON. Migration: pass `--format text` for the 11.5.0 lines, `--format json` to read the fields, or set `output: 'console'`.
- 36d0a1d: `testCommand()` is no longer exported from the root entry. Import it from `clibuilder/testing`, which 11.5.0 already exports.
  
  Upgrading from 11.5.0:
  
  ```diff
  - import { command, testCommand } from 'clibuilder'
  + import { command } from 'clibuilder'
  + import { testCommand } from 'clibuilder/testing'
  ```
  
  `@clibuilder/codemod` makes this change (`npx @clibuilder/codemod src`, or `--dry-run` to preview). `mockPluginContext()` stays in `clibuilder/testing`.
  
  The root entry's import graph no longer reaches any test-only code, so a CLI no longer loads the test helper, the mock context and its in-memory streams when it starts. Bundled, the root entry goes from 48 to 43 modules.
- 40d26cf: `testCommand(command, argv, options?)` takes one `options` object, `{ config, output, format }`, where it took `(command, argv, config?, options?)`. It also runs a `.default()` command. `@clibuilder/codemod` rewrites the old positional arguments.
  
  ```diff
  - await testCommand(cmd, 'cmd', { a: 1 }, { output: 'console' })
  + await testCommand(cmd, 'cmd', { config: { a: 1 }, output: 'console' })
  ```
  
  `mockPluginContext.Params` is now `mockPluginContext.Options`, and `loadPlugins.Context` is `loadPlugins.Options`. The old names stay as deprecated aliases, removed in clibuilder 13.
  
  `clibuilder/testing` adds `mockExtensionContext()`, which builds the `ExtensionContext` for testing an extension and captures the commands, global options, `beforeRun` hooks and shared state it adds.
- b27bf6f: Add the upgrade guide for clibuilder 12, [Upgrading from clibuilder 11 to 12](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/), and the `@clibuilder/codemod` package that does the mechanical part of the upgrade.
  
  Upgrading from 11.5.0: run `npx @clibuilder/codemod src`, then fix each `TODO(clibuilder-12)` comment it leaves and review the returned values it lists. The codemod rewrites `z` from `clibuilder` to `t`, moves the `@clibuilder/axi` value helpers to `clibuilder/axi`, moves `cli({ keywords })` to `.use(plugins({ keywords }))` from `@clibuilder/plugins`, and replaces `cli({ config })` with `.use(config())` from `clibuilder/config`. It flags what it cannot rewrite safely: zod forms outside the `t` subset and zod type annotations, a command's own `format` option, `ui.showHelp()` and `ui.showVersion()`, the other `@clibuilder/axi` imports, and `cli({ config })` without `plugins()`.
  
  `@clibuilder/codemod` 0.1.0 is published with this release. Preview with `npx @clibuilder/codemod --dry-run src`.

### Minor Changes

- 6809fee: `clibuilder/axi` now works without `cli()`. It exports the output contract (`encode`, `errorOutput`, `printAnswer`, `formats` and the `Format` type) next to `CliError` and `isCliError`, and adds `runScript(command, { argv?, streams? })`. `runScript` takes the same `{ options, run }` object you pass to `cli().command()`, parses `--format` and the options, prints what `run()` returns, and resolves to the exit code. `this` in `run()` is `{ format, ui }` with `ui` on stderr, so a command that reads `this.config` is a type error. A thrown `CliError` is reported on stdout with its exit code, and a bad invocation is reported with code `usage` and exit 2.
  
  `encode` and `printAnswer` are synchronous, and `@toon-format/toon` stays a static import.
- b5ec612: Add the `clibuilder/axi` subpath, which holds the value helpers from `@clibuilder/axi`: `truncateText`, `truncateList`, `defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader` and `collapseHome`. It also re-exports `result`, `document`, `empty` and `exitCodes`, so one import covers a command. `fullOption` is declared with `t.boolean().optional()` instead of zod.
  
  If you use `@clibuilder/axi`, import the value helpers from `clibuilder/axi` instead, for example `import { truncateList } from 'clibuilder/axi'`.
- 31eec28: A command's `config` takes any Standard Schema, such as zod 3.24 or later, zod 4, valibot or arktype. It is validated with `~standard.validate`, which is awaited when it returns a promise, and `this.config` is typed from the schema's output. A failure is reported with each issue's message under the dotted path of the value that failed, or under `(config)` when the issue has no path, and the cli exits with code 1. Help shows the config under `Config:` from the JSON Schema of its input when the schema implements `~standard.jsonSchema`, and leaves the section out otherwise.
  
  `this.config` is the config schema's output, not the loaded input. In 11.5.0 a `.default()` or `.transform()` in a config schema had no effect. Now defaults are filled in and transforms applied, and `z.object()` strips keys it does not declare.
  
  With no config file, a schema that rejects `undefined` is validated against `{}`, so a command whose config keys all have defaults runs with them, in a CLI and in `testCommand()` without a config. A missing required key is reported by name. In 11.5.0 both failed with `expected object, received undefined`.
  
  `no config found` and the file names searched for are a `debug` message, shown under `--verbose` and `--debug-cli`, not a warning on every run.
- ad6b788: Accept the global options before the command.
  
  `--help`, `--version`, `--verbose`, `--silent`, `--debug-cli`, `--show-config` and the global `--format` may come before the command, after it, or between a group and its sub-command: `app --verbose deploy`, `app --format json plugins list` and `app plugins --format json list` run the same command as `app deploy --verbose` and `app plugins list --format json`. Before, a global option before the command took the command name as its value, so these were usage errors.
  
  A global option that takes a value, such as `--format json`, takes only that value. Its arity comes from the base command, the same source the global options are read from, so the value is never read as a command name.
  
  A command's own options still go after the command: `app --force deploy` stays a usage error that names `--force` as unknown, and words after `--` never name a command.
  
  One invocation that worked before changes: when the default command takes an argument, `app --verbose deploy` used to pass `deploy` to it; it now runs the `deploy` command, as `app deploy` does.
- 20aaa9c: A command may declare `examples: { command, description }[]`. They are shown in an `Examples` section at the end of the command's text help, each description above its command line, and a usage error handler reads them from `context.command.examples`. A command that declares none shows the same text help as before.
  
  The structured help that `--help` answers under `--format toon` and `--format json` holds `name`, `usage`, `description`, `aliases`, `commands` (name, aliases and the first line of each description), `arguments` and `options` (type, `min`, `max`, `pattern` or allowed `values` of a `t` declaration, default, `required`, description, conflicts), `config`, `examples`, and the global options once under `globalOptions`.
- 5dbee67: `CliError` is now a structured report. Besides `message`, `help` and `exitCode`, it carries a `code`, a stable kebab-case string that says which failure it is (`error` by default), and `details`, a flat record of extra fields. Pass them as options, `new CliError(message, { code, details })`, or pass the whole report, `new CliError({ message, code, details, help, exitCode })`. `exitCode` accepts any integer from 1 to 255, and `0` or any other value now throws a `RangeError`.
  
  In the default `axi` output, a `CliError` thrown from `run()` is reported on stdout with these fields, in `this.format`, and a debugging copy is a `debug` line under `--verbose`. The new `cli({ format })` option sets the default format: `'toon'` (the default, through `@toon-format/toon`), `'json'` or `'text'`. In `output: 'console'`, errors are reported as in 11.5.0.
  
  `CliError.reported(exitCode)` is a `CliError` for a failure that was already reported: the CLI exits with `exitCode` and prints nothing for it.
- 73adba2: Resolve the global options before usage errors are reported, and tell `onUsageError` more.
  
  The global options (`--help`, `--version`, `--verbose`, `--silent`, `--debug-cli`, `--show-config` and `--format`) are read from the base command before the matched command's usage errors are looked at. The base command is the one source for them: a well-formed global flag is never an unknown option under a sub-command, and a malformed one, such as `--verbose=maybe`, is reported once as the invalid value it is.
  
  The `onUsageError` context gains `format`, the format the CLI reports in, the same as `this.format`, and `exitCode`, the code the CLI exits with when the handler returns none (`exitCodes.usage`). The new `cli.UsageErrorContext` and `cli.Format` types describe them.
  
  Each `UsageError` handed to `onUsageError` gains `code`, a stable kebab-case string beside `type`: `unknown-option` for `invalid-key`, and the same as `type` for `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` and `extra-arguments`. It is not enumerable, so `JSON.stringify` and equality checks on an error are unchanged.

### Patch Changes

- a05bdfa: The `exitCodes` TSDoc and the Failing guide now state that core names only 0, 1 and 2, and that a cli sets any other exit code (1 to 255) on `CliError` and names the failure with `code`.
- e1fb5ef: Fix the published types: `cli({ streams })` now takes a small structural stream type (`write(chunk: string)`, with optional `isTTY` and `hasColors()`) instead of `NodeJS.WritableStream`. A TypeScript consumer without `@types/node` and with `skipLibCheck: false` no longer gets error TS2503 (cannot find namespace `NodeJS`) from `clibuilder`'s declarations. `process.stdout` and `process.stderr` still fit.
- ac9c2fb: Replace the `jsonc-parser` dependency with an internal comment and trailing-comma stripper that feeds `JSON.parse`. Valid `.json` and `.jsonc` config files parse as before, and core's only dependencies are now `@toon-format/toon` and `args-minus`. A parse error message now carries the `JSON.parse` message instead of a `jsonc-parser` error code.
- e395442: Fix the plugin example in the README, which used a nonexistent `PluginCli.ActivationContext`, and state that 12 is ESM-only with `require()` through `require(esm)`.
- 6f59df9: `clibuilder/axi` also exports `CliError` and `isCliError`, so one import covers a command. `clibuilder/compile-cache` exports only `enableCompileCache`; the test hook it leaked is internal. `truncateText`, `truncateList` and `homeHeader` gain `Options`/`Result` namespaces, and `runCodemod` and `transform` in `@clibuilder/codemod` gain `Options`/`Summary`/`Result` in place of the flat `RunOptions`, `RunSummary`, `TransformOptions` and `TransformResult`. The registry, config loading, `UI` and `ExtensionContext` exports are documented.

## 11.5.0

### Minor Changes

- 8cf4fc8: Re-export the `t` option type descriptors from `args-minus`, with the descriptor types (`Descriptor`, `AnyDescriptor`, `OutputOf`, `DescriptorData`, `DescriptorKind` and more).
  An argument or option can declare its `type` with `t` instead of `z`, and `run()` gets the descriptor's exact output type.
  Each declaration is parsed by its own type, so a command can mix `z` and `t`; `z` declarations behave as before.
  
  Declarations with `t` are converted and checked by `args-minus` (`parseArgsAsync`), so converters and checks may be async.
  A failure is an `invalid-value` usage error carrying the new `keyKind`, `constraint`, `allowed` (for `t.enum`) and `index` (for `t.array`) fields;
  a required `t` option that is missing is a `missing-argument` error naming the option.
  
  Help shows a `t` declaration's constraint, e.g. `[--port <int 1..65535>]`.
  
  `UsageError` `expect-single` gains `keyKind`, the kind string of the option. Its `keyType` zod object is deprecated and is `undefined` for a `t` option.
- 16562e2: Add `cli().use(extension)`: a general hook that adds commands and registry entries before `parse()` picks the command to run. The extension receives an `ExtensionContext` with `host`, `cwd`, `ui`, `registry`, `addCommand` and `resolveConfig()`.
  
  Extensions run in the order `use()` was called, each awaited before the next, on the first `parse()` that needs the command tree; their commands come after the CLI's own. A bare `--version` is answered without running them. `use()` makes `parse()` available.
  
  This is the hook `@clibuilder/plugins` plugs into. When its `plugins()` extension is used, `clibuilder` skips its own config-driven plugin loading and its automatic `plugins` group, so nothing loads twice. Without it, plugin loading, `keywords` and the automatic `plugins` group work as before; they move out of core in v12.

### Patch Changes

- 791e8ca: Answer `--version` or `-v` given alone before the config loads and plugins activate, so a broken config or a hanging plugin no longer fails or delays it. The version is written to stdout as plain text. Any other invocation, such as `cli cmd --version`, is unchanged.
- Updated dependencies [8cf4fc8]
- Updated dependencies [bcc756d]
  - args-minus@0.2.0

## 11.4.0

### Minor Changes

- e4afa97: A command group invoked without a sub command now exits with `exitCodes.usage` (2).
  
  A command that has `commands` but no `run` — and a cli with sub commands but no `default()` — still prints its help, but no longer exits `0`: a caller must add a sub command, so a bare call is a usage error. Asking for help explicitly (`my-cli send --help`) still exits `0`.

### Patch Changes

- 3385356: Ship the TypeScript sources from `src/` instead of `ts/`. Source maps now point into `src/`.
- 296e19f: Update `type-plus` to 8.0.0 and `standard-log` and `standard-log-color` to 13.3.2.

## 11.3.3

### Patch Changes

- 8d848ad: Report a malformed value on a global option given to a sub-command (e.g. `cli sub --verbose=notabool`) as a usage error, as the root command does, instead of silently running the sub-command (#614).

## 11.3.2

### Patch Changes

- 618d854: Resolve a plugin from the working directory, where the project that lists it installed it. A cli run through `npx` or a global install, or one that inlines clibuilder into its own bundle, could not load a plugin from the project's `node_modules` before this.

## 11.3.1

### Patch Changes

- 2f403eb: Update `type-plus` to `8.0.0-beta.12`, and `standard-log`, `standard-log-color`, `tersify`, `find-installed-packages`, and `search-packages` to their latest releases.

## 11.3.0

### Minor Changes

- db77cad: `parse()` now resolves to the exit code it records when the cli fails: an unknown option or command, a group invoked without a sub command, a config that fails validation, or a thrown `CliError`. It used to resolve to `undefined` there, so a caller had to read `process.exitCode` to learn the outcome. The code is still recorded on the process as before.

## 11.2.2

### Patch Changes

- dabd741: Keep a passed `0`, `false`, or `''` instead of replacing it with the option's `default` (#620).

  A default now applies only when the option was not passed, so `--timeout 0`, `--verbose false`, and `--label=` reach `run()` as given.

## 11.2.1

### Patch Changes

- 37f1ab1: Fix `import('clibuilder')` failing with `ERR_MODULE_NOT_FOUND` for `esm/invocation/argv.internal.js` (#617).

  The package's `files` list excludes `**/*.internal.*`, which also dropped a module the ESM build imports at runtime. The module is renamed to `argv_occurrences`, so it is published again. A test now fails if a published module imports a file the `files` list excludes.

## 11.2.0

### Minor Changes

- 240fd18: A command group invoked without a sub command now exits with `exitCodes.usage` (2).

  A command that has `commands` but no `run` — and a cli with sub commands but no `default()` — still prints its help, but no longer exits `0`: a caller must add a sub command, so a bare call is a usage error. Asking for help explicitly (`my-cli send --help`) still exits `0`.

- 5ffa775: Add `conflicts` to an option entry to declare options that cannot be used together.
  Passing both is a usage error (exit code 2), reported as a `conflicting-options` entry in the `lookupCommand` error list.
  A default value does not count as passed, aliases are resolved, and the help message lists the conflict on both options.
- 82e017c: Add `onUsageError(errors, { command, ui })` to report usage errors in your own format.
  Usage errors are an unknown option, a missing or extra argument, and an invalid value.

  Declare it on `cli()` options for the whole cli, or on a command for that command and its sub-commands.
  This includes commands that plugins add.
  clibuilder calls the matched command's handler, else the nearest enclosing command's, else the `cli()` one.
  The handler gets the structured errors and the matched command, and chooses what to print and whether to show help.
  The cli still exits `2` unless the handler returns another exit code.

### Patch Changes

- da51ad2: Take only as many tokens after an option as its type allows, so `<cmd> --flag value <positional>` works.

  A string, number, or enum option takes one following token.
  A boolean option takes none, unless the token is `true` or `false`.
  An array option still takes every following token.
  The other tokens are positionals.
  Before, `read --lines 5 %1` failed with `--lines expects a single value`, and `read --full %1` failed with `expected to be boolean`.

- 36be9c9: Declare `tersify` as a runtime dependency.

  `ts/ui.ts` imports `tersify` to render the `Config:` section of help, but it was listed
  under `devDependencies`. The CJS build bundles with esbuild, so CJS consumers had it
  inlined and never saw the problem. The ESM build is plain `tsc`, which emits a bare
  specifier:

  ```js
  // esm/ui.js
  import { tersify } from "tersify";
  ```

  So an ESM consumer whose command declares a `config` schema could fail to resolve
  `tersify` when help was rendered — it only worked where the package manager happened to
  hoist it transitively. No API change; the dependency is simply declared where it is used.

## 11.1.0

### Minor Changes

- 6c03448: Adopt `standard-log@^13.2.0` and `standard-log-color@^13.2.0` (from `^12.1.2` / `^12.1.1`), and bump the devDependencies `@repobuddy/jest` to `^6.0.0` and `@unional/fixture` to `^5.0.0`.

  `standard-log@13.2.0` is the release that widened `@just-func/types` from `^0.5.0` to `^0.6.0`. The previously-resolved `@just-func/types@0.5.1` depends on `type-plus@^5.0.0`, and a caret on a `0.x` range cannot cross that minor, so every consumer of the older `standard-log` dragged a stale `type-plus@5.6.0` and `tersify@3.12.1` into its tree regardless of what it pinned itself. Adopting `standard-log` 13 removes that stale transitive `type-plus`/`tersify` pair from consumers' resolved trees.

  No source changes were required: `clibuilder`'s own build, type-check, and test suite are unaffected. `standard-log` and `standard-log-color`'s major version bumps did not change their public API (their own release notes describe unrelated changes: a build-tooling switch and dropped ES5 output), but they are runtime `dependencies` of `clibuilder` whose types leak into its emitted declarations, and consumers now resolve a new major of a runtime dependency — hence a `minor` rather than `patch`.

## 11.0.0

### Major Changes

- d3507e4: Pin `type-plus` to `8.0.0-beta.10`.

  Published `clibuilder@10.1.0` declares `type-plus: ^7.0.0`. Consumers that also
  depend on the type-plus 8 line — `mocktomata` and `node-supported-releases`
  resolve type-plus _through_ clibuilder — end up with two majors of type-plus
  (and of `tersify`) in one tree. This release moves clibuilder onto 8.

  This is a **major** for two independent reasons:

  1. type-plus types leak into clibuilder's emitted declarations. `esm/cli.d.ts`,
     `esm/builder.d.ts` and `esm/state.d.ts` all `import type ... from 'type-plus'`
     (`RequiredPick`, `UnionOfValues`), so consumers compile against type-plus 8
     directly and inherit its new `peerDependencies: { typescript: '>= 5.6.0' }`.
     type-plus 5, 6 and 7 declared no typescript peer at all.
  2. The repo's TypeScript range moves from `^5.0.4` to `^5.9.3`. Independently of
     type-plus, that raises the compiler floor for anyone building against these
     declarations.

  `type-plus` is pinned exactly rather than caret-ranged. `^8.0.0-beta.10` resolves
  to `>=8.0.0-beta.10 <9.0.0-0`, admitting every later 8.0.0 prerelease plus
  `8.0.0` and `8.1.0`. The 8 line is a prerelease line where breaking changes land
  between betas — beta.10 to beta.11 changed `Equal`'s signature and removed
  `isType.f`. An exact version makes each bump a reviewable PR instead of something
  a lockfile refresh can do silently.

  Also bumps the `tersify` devDependency to `^4`, matching the copy type-plus 8 and
  `assertron@11.6` already bring in. `engines.node` is unchanged at `>= 20.19`,
  which already satisfies the `>= 20` that type-plus 8's `unpartial@^1.0.7`
  dependency requires.

## 10.1.0

### Minor Changes

- c71f536: Report usage errors and exit non-zero.

  A clibuilder cli could not fail. `lookupCommand` already built a typed list of everything wrong with
  an invocation — unknown option, missing argument, extra arguments, a value of the wrong type — and
  `builder` threw it away and printed the help message with an exit code of `0`. A command that knew
  it had failed had no way to say so either.

  - Usage errors are now reported by name (`unknown option --bogus`, `missing required argument
<target>`) ahead of the help message, and the cli exits `2`.
  - A config that fails its schema exits `1`.
  - A command fails by throwing the new `CliError`, which carries an `exitCode` and optional `help`
    lines. `parse()` still resolves rather than rejecting, so the failure is reported instead of
    surfacing as an unhandled rejection.
  - New exports: `CliError`, `exitCodes` (`success`/`error`/`usage` — 0/1/2), and `isCliError()`.
  - `testCommand()` returns the `exitCode` alongside `result` and `messages`, so a test can assert a
    failure without ending the test run.
  - `--help` and `--version` are accepted by every command, including sub-commands that declare no
    options of their own, and both still exit `0`.

  The exit code is recorded on `process.exitCode` rather than applied with `process.exit()`, so
  pending stdout writes are not truncated.

  **This changes the behavior of every cli built with clibuilder**: an invocation with a typo used to
  exit `0` and now exits `2`. The TypeScript surface is additive, which is why this is a minor rather
  than a major, but a caller downstream of your cli that ignored the exit code will now see it fail.

- 2f4afde: Add `--format` to `plugins list`.

  `plugins list --format <toon|text|json>` picks how the installed plugins are rendered,
  matching `plugins search`. The default is `toon`, following the Agent eXperience
  Interface — a cli's plugin list is read by an agent far more often than by a person:

  ```
  plugins[2]: my-cli-plugin,@acme/my-cli-plugin-deploy
  help[1]: Run `plugins search` to find more plugins on npm
  ```

  Nothing installed is stated as the answer rather than left as silence, and it says
  `installed` because that is the whole difference from what `search` reports — nothing
  installed here says nothing about what exists on npm:

  ```
  plugins: 0 installed plugins found with keywords: my-cli-plugin
  help[1]: Run `plugins search` to find plugins to install
  ```

  `--format text` is the previous human-readable prose, unchanged, including its separate
  wording for none, one, and several. `toon` and `json` report one shape whatever the
  count. `--format json` emits `{ "plugins": [...] }` alone, with no help line, so it
  survives a pipe into `jq`. The command still returns the plugin names to its caller.

- 4925f20: Match `plugins search` keywords disjunctively, and add `--format` to its output.

  A cli declaring several keywords used to find only packages carrying _all_ of them, so
  a plugin tagged with one of the cli's keywords was never listed. Each keyword is now
  searched on its own and the results are unioned, deduped, in keyword order.

  `plugins search --format <toon|text|json>` picks how that result is rendered. The default
  is `toon`, following the Agent eXperience Interface — a cli's plugin search is read by an
  agent far more often than by a person, and toon is the cheaper read for one:

  ```
  packages[2]: pkg-x,pkg-y
  help[1]: Run `plugins list` to see which of them are installed
  ```

  `--format text` is the previous human-readable prose, unchanged. `--format json` emits
  `{ "packages": [...] }` alone, with no help line, so it survives a pipe into `jq`.

  `--fields keywords` adds which of the cli's keywords found each package — the question
  disjunctive matching makes worth asking, since one over-broad keyword can now pull in a
  package that is not a plugin at all. It is off by default: a cli with a single keyword
  would spend the column on a value every row repeats.

  ```
  packages[3]{name,keywords}:
    my-cli-plugin-alpha,my-cli-plugin
    shared-plugin,my-cli-plugin unional
    unional-tool,unional
  ```

### Patch Changes

- 033a38a: Reject an option value the option's `type` does not accept.

  A value that failed the option's schema used to be dropped and replaced by the option's
  `default`, so `--format yaml` quietly rendered `toon` and the caller had no way to tell.
  It is now reported as a usage error and the cli exits with `2`, the same as an unknown
  option. An enum lists what it would have accepted, so the invocation can be fixed in one
  step:

  ```
  error: invalid value for option --format: expected one of: toon, text, json, received "yaml"
  ```

  This applies to every option whose `type` clibuilder does not convert itself — `z.enum`
  above all. Booleans and numbers already reported their own conversion errors and are
  unchanged.

## 10.0.0

### Major Changes

- 7b17641: Require Node.js >= 20.19 and update `find-installed-packages` to `^4.0.0`.

  `engines.node` moves from `>= 18` to `>= 20.19`, matching what
  `find-installed-packages@4` supports. Node 18 and 19 reached end of life, so
  there is no supported runtime left below that floor.

  v4 also changes how plugins are discovered. It walks the declared dependency
  graph and asks the runtime's module resolver where each package lives, instead
  of scanning `node_modules`. That fixes discovery under pnpm, Yarn Plug'n'Play,
  and workspaces where the tree is hoisted to the repo root. The trade-off: only
  _declared_ dependencies are reported, so a plugin sitting in `node_modules` that
  nothing depends on is no longer found — add it to your `package.json`
  dependencies if you were relying on that.

## 9.2.0

### Minor Changes

- 8703dcc: Add a typed plugin registry for content contributions and cross-plugin capabilities.
- d709f62: Coerce argument and untyped-option values to match their declared types.

  Both fixes close a gap where the type system and the runtime disagreed about what `run(args)`
  receives.

  - Positional arguments are now coerced through the same conversion path options already use.
    `type: z.number()` yields a `number`, `type: z.array(z.number())` yields `number[]`, and a value
    that fails its schema is a usage error instead of being silently dropped. An array argument is
    variadic: it consumes the remaining positionals. Previously every argument arrived as a raw string,
    and `z.array(z.number())` ended up `undefined`.
  - An option declared without a `type` now defaults to `z.optional(z.boolean())` instead of
    `z.optional(z.string())`, so a flag yields a real `true` rather than the string `'true'`.
    `RunArgs` has always inferred this case as `boolean | undefined`.

  Note two behavior changes for code that relied on the old runtime values:

  - `--flag=somevalue` on an option with no declared `type` is now a usage error. Declare
    `type: z.string()` to keep accepting a string value.
  - An argument declared with a type that has no string conversion (`z.enum`, `z.literal`) now has the
    raw argv string handed to its schema, which accepts or rejects it. It is no longer passed through
    unvalidated.

- 9b629d0: Config subsystem: jsonc support, a public lookup/load API, and `--show-config`.

  **JSONC config (#341)**

  `.jsonc` and `.jsonc`-suffixed rc files are now searched for, and `.json` files may contain comments
  and trailing commas. Parsing goes through `jsonc-parser`, so comment-like sequences inside strings
  are left alone — `"http://example.com"` is no longer at risk of being truncated at the `//`.

  The format is now chosen by extension rather than by trying every parser in turn. Extension-less
  candidates such as `.apprc` still infer their format from content (JSONC, then YAML, then module).
  One consequence: a `.json` file that is not valid JSON now reports a parse error naming the file,
  where before it was silently retried as YAML and could load as something unintended.

  **Config lookup/load API (#488)**

  `clibuilder` now exports its config resolution, so plugins and tools can ask where a config came
  from, not just what it holds:

  - `lookupConfig({ cwd }, name)` — resolve the origin without reading the file
  - `resolveConfig({ cwd, ui }, name)` — the config plus its provenance
  - `loadConfig`, `readConfigFile`, `getConfigFilenames`, `getConfigFormat`, `describeConfigSource`

  A resolved `source` is `{ type: 'file', path, format }`, `{ type: 'package.json', path, property }`,
  or `{ type: 'none' }`. These are read-only; writing config back to disk is not supported yet.

  **`--show-config` (#317)**

  A cli declaring `config` now accepts `--show-config`, which prints the resolved config and where it
  was loaded from — the matching file path, the `package.json` property, or that nothing was found.
  Clis without config do not advertise the option.

### Patch Changes

- 2efd5dc: Fix optional and variadic arguments in the help output.

  The `Arguments:` section tested the `isOptional` _method_ instead of calling it, so a typed required
  argument rendered as `[name]` and an optional one as `<name>`, exactly backwards. Arguments now use
  the same notation as options: `<name>` when required, `[name]` when optional, with the declared type
  (`=string`, `=number`, `=boolean`) and a `...` variadic marker.

  ```
  Arguments:
    <src=string>           the source
    [host=string]          the host
    <files=string...>      the files
  ```

- 3fda89f: Resolve command aliases such as `plugins ls` when parsing CLI input.

## 9.1.0

### Minor Changes

- e8bb823: Resolve the config file with a single upward directory walk instead of one walk per candidate name.

  `getConfigFilenames()` produces ~28 candidate names, and each one used to be searched with its own
  `findUpSync()` call — 28 walks from `cwd` to the filesystem root to answer one question. Each ancestor
  directory is now read once and matched against every candidate. From a directory 13 levels below the
  config, the lookup drops from 165 `stat` calls to 13 `readdir` calls (~0.51 ms to ~0.15 ms); when no
  config exists, from 580 `stat` calls to 40.

  **Behavior change — nearest config now wins.** Because candidates used to be searched one full walk at
  a time, a lower-priority name in a _nearer_ directory lost to a higher-priority name in a _farther_
  one: a `foorc.json` in a grandparent beat a `foo.yaml` in the current directory. Resolution is now
  directory-first — the nearest ancestor containing any candidate wins, and the candidate order only
  breaks ties within that directory. This matches how other config loaders behave. Projects with config
  files at more than one level of the tree may now load a different file.

  `find-up` is no longer a dependency; the walk used for `package.json` lookup moved to an internal
  helper as well.

- deac99f: Add `clibuilder/compile-cache`, an opt-in helper to turn on node's V8 compile cache from your cli's bin script.

  ```js
  import { enableCompileCache } from "clibuilder/compile-cache";

  enableCompileCache();

  const { cli } = await import("clibuilder");
  ```

  Measured on the `test-apps` fixtures (node 24, median of 25 warm runs), startup drops from 86ms to 81ms for the `ESM` build and from 43ms to 37ms for the `CJS` build.

  The helper never throws, and does nothing on runtimes without the API (node < 22.1, `bun`, `deno`). `NODE_COMPILE_CACHE` takes precedence when the user sets it.

### Patch Changes

- 10cea5a: Load `find-installed-packages` and `search-packages` lazily.

  They are only needed by `plugins list` and `plugins search`, but `commands.ts` sits on the startup path of every CLI invocation. They are now pulled in with a dynamic `import()` at call time, cutting roughly 20ms off startup.

- f462467: Point the package's `homepage`, `bugs`, and `repository` URLs at `clibuilder/clibuilder`. They still named `unional/clibuilder`, which the repository moved away from — npm rendered the old owner on the package page and linked issues to a redirect.
- 4cc248e: Update `tmp` and `js-yaml`
- 28ae843: Update dependencies (find-installed-packages, tmp, ts-jest, npm-run-all2, rimraf) and modernize internals: replace `.then()` chains with async/await in `builder.ts` and `plugins.ts`, bump `engines.node` to reflect actual ESM support.
- 3b0870c: Update `search-packages` to `^2.2.0`.

  It replaces its `npm search` shell-out with a direct `fetch()` against the registry, so `plugins search` no longer requires `npm` on `PATH` — it now works for standalone CLI installs and under bun/deno — and drops the process-spawn cost from the command. The API `clibuilder` uses is unchanged.

## 9.0.0

### Major Changes

- de5c0b5: Drop support of global config.
  It is not really a use case to begin with,
  and it is causing problems in CI as CI nowadays not setting `USERPROFILE` var as assumed.

### Patch Changes

- db9c301: improve imports (e.g. `import type ...`)

## 8.0.17

### Patch Changes

- 38920e0: Update readme

## 8.0.16

### Patch Changes

- 0ead505: Default keywords to the name of the cli if it is plugin cli and keywords are not specified.

## 8.0.14

### Patch Changes

- 9acc311: Fix running parent command withou `run()` will show help.

## 8.0.13

### Patch Changes

- 0c221b6: Update standard-log to v12

## 8.0.12

### Patch Changes

- 52f3951: CLI with config defined should be assumed to have command. So parse function should be available.
- 41d8fad: update `type-plus` to 6.6.0

## 8.0.11

### Patch Changes

- c36be5b: Fix `testCommand()` log format when the log argument contains object.

## 8.0.10

### Patch Changes

- 0ab7c75: Add test-utils folder back.
  It is actually needed by `testCommand`.

## 8.0.9

### Patch Changes

- c3b7480: Remove extra files from package

## 8.0.8

### Patch Changes

- fix publish package content

## 8.0.7

### Patch Changes

- e12f0ea: adjust options help display.

  remove `postinstall` script

## 8.0.6

### Patch Changes

- 251aba2: Fix array options default value should not be wrapped in an array if it is already an array.
- fcd4fb8: Adjust `exports` field order.
  Add `main` field for compatibility.

  Remove extra deps.

## 8.0.5

### Patch Changes

- f81b68c: Update `type-plus`

## 8.0.4

### Patch Changes

- re-release with typings

## 8.0.3

### Patch Changes

- d8b5de1: Update `type-plus` and `standard-log`

## 8.0.2

### Patch Changes

- e39a3c9: Add `tmp` as dependencies.
  It is used by `testCommand()` which is part of public API.

## 8.0.1

### Patch Changes

- 7686ce0: Update README

## 8.0.0

### Major Changes

- 10d018e: `name` and `version` is now required, will not load from the CLI's `package.json` anymore.
  This allows the CLI to be used as standalone app.

  Change `configName` to `config`.
  If not specified, config will not be loaded.
  You can set it to `true` or to a specific config file name.

  Config is now used to control which plugin to load,
  similar to other tools such as `eslint` and `jest`.
  It accepts `json`, `yaml`, or `js` file.

  To specify plugins, add them under the `plugins` property:

  ```json
  {
    "plugins": ["your-plugin"]
  }
  ```

  As such, `loadPlugins()` is removed.

  Change `keyword` to `keywords`. It is now used for searching and listing of plugins,
  instead of controlling whether to load config.

- e121c23: Load plugins explicitly.
  This will be removed complete later on when adding config file support.

  Remove `findByKeywords()` in `loadPlugins()` as a result (for loading local plugins automatically).

- d14a215: Remove global plugin searches.
  In 8.0, we are dropping keyword-based plugin loading.
  Instead, we will support loading plugins based on config file.

  Updated dependencies.

### Patch Changes

- bccc80f: fix(clibuilder): export types

  The top-level `typings` field is not picked up by ESM use case.

## 7.2.1

### Patch Changes

- 24c2c89: Upgrade `zod` to `3.17.2`
- c32309c: Update these dependencies:

  - `global-store`: `1.0.0-beta.17` -> `1.0.0.beta.21`
  - `standard-log`: `5.4.0` -> `7.1.0`
  - `standard-log-color`: `2.1.0` -> `4.0.0`
  - `tslib`: `2.1.0` -> `2.4.0`
  - `type-plus`: `3.13.1` -> `4.9.1`

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.1.1"></a>

## [4.1.1](https://github.com/unional/clibuilder/compare/v4.1.0...v4.1.1) (2019-02-05)

### Bug Fixes

- CliCommandInstance.config can be undefined. ([#201](https://github.com/unional/clibuilder/issues/201)) ([185e7e4](https://github.com/unional/clibuilder/commit/185e7e4))

<a name="4.1.0"></a>

# [4.1.0](https://github.com/unional/clibuilder/compare/v4.0.0...v4.1.0) (2019-02-04)

### Features

- add searchPackage command for plugins ([#200](https://github.com/unional/clibuilder/issues/200)) ([4c3723c](https://github.com/unional/clibuilder/commit/4c3723c))

<a name="4.0.0"></a>

# [4.0.0](https://github.com/unional/clibuilder/compare/v3.0.0...v4.0.0) (2019-02-04)

### Features

- major refactor ([#199](https://github.com/unional/clibuilder/issues/199)) ([f081b14](https://github.com/unional/clibuilder/commit/f081b14))

### BREAKING CHANGES

- setupCliCommandTest signature changed

There are also a few more type-related changes.
Mostly config and context are now an explicit property on the `Cli` and the commands.

Before this, the context was merged to the command itself.

- fix: expose error classes that didn't expose before.

- refactor: move files to arg-parser and presenter

Also, rename the folders to follow package conventions.

Check folder is treated as a sub-package.
It tests its code and gets the code from '.' when possible.

The top-level should do acceptance tests.
