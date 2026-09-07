# Change Log

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
