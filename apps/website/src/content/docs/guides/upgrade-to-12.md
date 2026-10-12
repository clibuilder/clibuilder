---
title: Upgrading from clibuilder 11 to 12
description: "What clibuilder 12 changes for a CLI author, in the order you upgrade, with the one-line fix for each change and a codemod for the mechanical parts."
---

`clibuilder` 12.0.0 is published. This page describes what it changes for a CLI built on `clibuilder`
11.5.0, and how to upgrade. It covers both RFCs that set the design of 12:

- [axi-native](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md): output
  modes, formats, errors, help and exit codes.
- [slim-dependencies](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md):
  `t` instead of zod, config, logging and plugins.

The RFCs are the authority. Where this page differs from them, they win.

Each section says what changed, who is affected, the one-line fix, and shows the code before and
after. Each section also has one label:

- **Shipped in 12.0.0**: the change is in `clibuilder` 12.0.0.
- **Available in 11.5.0**: you can adopt it in a v11 CLI before you upgrade.

[The roadmap](/clibuilder/roadmap/v12/) tracks the status of each change.

## Run the codemod first

The codemod rewrites what it can, and marks what it cannot:

```sh
npx @clibuilder/codemod --dry-run src
npx @clibuilder/codemod src
```

`@clibuilder/codemod` runs through `npx`; it needs no install.

It takes files, directories and globs. `--dry-run` prints a unified diff and writes nothing. It
ends with a summary of three kinds of finding:

- **rewritten**: the codemod changed the code. Review the diff.
- **flagged**: the codemod could not change the code safely. It added a
  `// TODO(clibuilder-12): …` comment above the line that says what to do. Search for
  `TODO(clibuilder-12)` and fix each one by hand.
- **returns to review**: every `return <expr>` in a `run()`, listed with its file and line, because
  12 prints it (see [Returned values are printed](#returned-values-are-printed)).

What it rewrites and what it flags:

| Code | Codemod |
| --- | --- |
| `import { z } from 'clibuilder'` and the supported `z` calls | rewritten to `t` ([zod is replaced by `t`](#zod-is-replaced-by-t)) |
| `z.object`, `z.coerce`, refinements, transforms, `.default()`, `.describe()` | flagged |
| zod types such as `z.ZodOptional<…>` and `z.infer<…>` | flagged |
| a command's own `format` option | flagged ([`--format` is global](#--format-is-global)) |
| `ui.showHelp()` and `ui.showVersion()` | flagged ([`--help` and `--version` belong to core](#--help-and---version-belong-to-core)) |
| value helpers from `@clibuilder/axi` | moved to `clibuilder/axi` |
| other imports from `@clibuilder/axi` | flagged ([`@clibuilder/axi` moves into `clibuilder`](#clibuilderaxi-moves-into-clibuilder)) |
| `cli({ keywords })` | rewritten to `.use(plugins({ keywords }))` ([plugins move out of core](#plugins-move-to-clibuilderplugins)) |
| `cli({ config })` | rewritten to `.use(config())` ([config loads through `.use(config())`](#config-loads-through-useconfig)); with `--add-plugins`, also adds `.use(plugins())`, and without it flags the call, since 12 no longer loads plugins from `config` |
| config functions imported from `clibuilder` | moved to `clibuilder/config` |
| `this.keywords` | flagged |
| `import { testCommand } from 'clibuilder'` | moved to `clibuilder/testing` ([`testCommand` is only in `clibuilder/testing`](#testcommand-is-only-in-clibuildertesting)) |
| `testCommand(cmd, argv, config, options)` | rewritten to `testCommand(cmd, argv, { config, ...options })` ([`testCommand` is only in `clibuilder/testing`](#testcommand-is-only-in-clibuildertesting)) |
| `return <expr>` in `run()` | listed for review |

When it adds an import from `@clibuilder/plugins`, it also adds the package to the nearest
`package.json`. Run your package manager's install afterwards. Running the codemod twice does not
change the result of the first run.

## Output modes: `axi` is the default

**Shipped in 12.0.0.**

**What changed.** `clibuilder` 12 has two output modes, and `axi` is the default. Both modes
are permanent, and neither is deprecated. `axi` makes stdout carry only answers, in a format an
agent or a script can read. `console` is how `clibuilder` 11 behaves.

| | `output: 'axi'` (12 default) | `output: 'console'` (11 behaviour) |
| --- | --- | --- |
| Value returned from `run()` | stdout, encoded | not printed |
| Thrown `CliError` | stdout, encoded once | message and help on stderr |
| Usage error | stdout, ranked and coded, exit 2 | prose and full help on stderr, exit 2 |
| `--help`, `--version` | stdout | stdout |
| `ui.info`, `ui.debug` | stderr | stdout |
| `ui.warn`, `ui.error` | stderr | stderr |

**Who is affected.** Every CLI that does not set `output`. The sections below go through each row.

**Fix.** To keep the `clibuilder` 11 behaviour, set `output: 'console'`:

```ts
// before: clibuilder 11
cli({ name: 'my-cli', version: '1.0.0' })

// after: keeps the 11 behaviour in 12
cli({ name: 'my-cli', version: '1.0.0', output: 'console' })
```

In `console` mode the output is the `clibuilder` 11.5.0 output byte for byte, with one exception:
the help lists the global [`--format`](#--format-is-global) option, which every CLI has in 12. A
spec in the repository runs the same invocations against 11.5.0 and against 12 to keep it so.

`testCommand` follows the default too. Its `messages` now include the printed answer, such as a
returned value or a `CliError` report. To test a CLI that sets `output: 'console'`, pass the same
mode as `options.output`:

```ts
const { messages } = await testCommand(cmd, 'cmd', { output: 'console' })
```

Source: [axi-native section 3.10](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#310-output-modes-and-stream-routing).

## `ui.*` writes to stderr

**Shipped in 12.0.0.**

**What changed.** In `axi` mode, the default, every `ui` call is a diagnostic on stderr, including `ui.info`.
Answers go to stdout.

**Who is affected.** A CLI whose output a script reads, when the command prints it with
`ui.info`.

**Fix.** Return the value from `run()` instead of logging it.

```ts
// before: the answer is a log line on stdout
run() {
	this.ui.info(`version ${version}`)
}

// after: the answer is the returned value, printed on stdout
run() {
	return { version }
}
```

Source: [axi-native section 3.10](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#310-output-modes-and-stream-routing).

## Returned values are printed

**Shipped in 12.0.0.**

**What changed.** In `axi` mode, the default, a value other than `undefined` returned from `run()` is printed on stdout, encoded
in the resolved [format](#--format-is-global). `parse()` still resolves to the value, so tests and
programmatic callers see no change. Three helpers control the printed form:

- `result(value, { help, render })` adds `help` lines, or a renderer for one format.
- `document(content)` prints `content` verbatim, such as markdown or a diff.
- `empty(message)` reports an empty result. It exits 0.

**Who is affected.** A command that returns a value for programmatic use, or for its tests, and did
not mean to print it. This change is the most likely to surprise. The codemod lists every
`return <expr>` in a `run()` for you to review.

**Fix.** Keep the return when the value is the answer. Return `undefined` when nothing should print.

```ts
// before: the report was returned for tests, and logged for people
async run() {
	const report = await check()
	this.ui.info(report.summary)
	return report
}

// after: the report is the answer
async run() {
	return result(await check(), { help: ['run `my-cli fix` to add the missing packages'] })
}
```

Source: [axi-native section 3.5](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#35-no-result-channel-6395).
See [The result channel](/clibuilder/api/cli/#the-result-channel).

## `CliError` carries a code and details

**Shipped in 12.0.0.**

**What changed.** `new CliError(message, { code, details, help, exitCode })` is the structured
report of a failure. In `axi` mode core renders it once, on stdout, in the resolved format, under
the keys `error`, `code`, the `details` fields and `help`. Nothing is written to stderr for it.
`exitCode` accepts any integer from 1 to 255.

**Who is affected.** A command that reports a failure by writing it itself and then throwing, or a
script that reads errors from stderr.

**Fix.** Throw one `CliError` with a stable `code`, and stop writing the error yourself.

```ts
// before
this.ui.error(`no package.json in ${dir}`)
throw new CliError('failed')

// after
throw new CliError(`no package.json in ${dir}`, {
	code: 'not-found',
	details: { dir },
	help: 'run this from the project directory'
})
```

Source: [axi-native section 3.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#31-errors-are-reported-twice-6391).
See [Errors with `output: 'axi'`](/clibuilder/guides/failing/#errors-with-output-axi).

## Usage errors are ranked and coded

**Shipped in 12.0.0.**

**What changed.** In `axi` mode, the default, only the top-ranked usage error is reported, on stdout, in the
resolved format, with exit code 2. It has a `code`: `unknown-option`, `conflicting-options`,
`invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`. Its `help` lines hold the
command's usage line and, for `invalid-value`, the allowed values or the violated constraint. The
full help is no longer printed after a usage error, a config validation failure, or a bare command
group. `UsageError` gains `code`, and the `onUsageError` context gains `format`.

**Who is affected.** A script that reads usage errors from stderr. A CLI that uses
`createUsageErrorHandler` from `@clibuilder/axi`.

**Fix.** Delete the `onUsageError` handler that `@clibuilder/axi` provided. Core does the same work.

```ts
// before
import { createUsageErrorHandler } from '@clibuilder/axi'
cli({ name: 'my-cli', version: '1.0.0', onUsageError: createUsageErrorHandler() })

// after
cli({ name: 'my-cli', version: '1.0.0' })
```

Source: [axi-native section 3.3](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#33-usage-errors-default-to-prose-plus-help-on-stderr-6393).
See [Usage errors with `output: 'axi'`](/clibuilder/guides/failing/#usage-errors-with-output-axi).

## `--format` is global

**Shipped in 12.0.0.**

**What changed.** Every command accepts `--format <toon|json|text>`, in both output modes, and
`run()` reads the resolved value from `this.format`. The help lists it with the other global
options. The default is `toon`; change it with `cli({ format: 'text' })`. `-f` is
not reserved. A bad value is a usage error with code `invalid-value` and exit code 2. A command that
declares its own `format` option is a startup error.

**Who is affected.** A command, or a builtin, that declares its own `format` option. The codemod
flags each one.

**Fix.** Delete the option, and read `this.format`.

```ts
// before
command({
	name: 'list',
	options: { format: { type: z.enum(['text', 'json']).optional() } },
	run(args) {
		return args.format === 'json' ? JSON.stringify(items) : items.join('\n')
	}
})

// after
command({
	name: 'list',
	run() {
		return result({ items }, { render: { text: (v) => v.items.join('\n') } })
	}
})
```

Source: [axi-native section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#34---format-is-not-first-class-6394).
See [The global `--format` option](/clibuilder/api/cli/#the-global---format-option).

## `--help` and `--version` belong to core

**Shipped in 12.0.0.**

**What changed.** In `axi` mode, the default, core answers `--help` on stdout, following
`--format`: text help under `text`, and the structured help under `toon` and `json`. `--version` is
plain text in every format. Commands can show `examples` in their help.

`ui.showHelp()` and `ui.showVersion()` are deprecated, but they stay on `ui` in 12, so a command
that shows its own help keeps working. Called from `run()` in `axi` mode, `showHelp()` answers like
`--help`, in `this.format`, and `showVersion()` writes the version like `--version`. In `console`
mode they write the text help and the version on stdout, as in 11. They are removed in a later
major.

**Who is affected.** A command that calls `this.ui.showHelp()` or `this.ui.showVersion()`. The
codemod flags each call.

**Fix.** Let core answer `--help`. To answer with help from `run()`, return it.

```ts
// before
run() {
	this.ui.showHelp()
}

// after: a group without `run` already answers with its help
command({ name: 'group', commands: [list, show] })
```

Source: [axi-native section 3.7](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#37-help-is-not-agent-shaped-6397).
See [`--help` and `--version` with `output: 'axi'`](/clibuilder/api/cli/#--help-and---version-with-output-axi).

## `--show-config` answers on stdout

**Shipped in 12.0.0.**

**What changed.** In `axi` mode, the default, `--show-config` is an answer on stdout, following
`--format`, with nothing on stderr from it and exit code 0. `text` prints the lines 11 printed. `toon`
and `json` encode the source and the config: `source` (`file`, `package.json` or `none`), `path`,
`property` for a `package.json` source, and `config`. In `console` mode it writes the same lines
through `ui.info`, as in 11.

**Who is affected.** A script that reads `--show-config`. Its default format is now `toon`, not the
lines 11 printed.

**Fix.** Pass `--format text` to get the 11 lines, or `--format json` to read the fields.

```sh
# before
my-cli --show-config

# after: the same lines
my-cli --show-config --format text

# after: the fields
my-cli --show-config --format json
```

See [Inspecting the resolved config](/clibuilder/guides/configuration/#inspecting-the-resolved-config).

## zod is replaced by `t`

**Shipped in 12.0.0.** `t` is re-exported from `clibuilder` since 11.5.0. In 12, `z`, zod and the
`isZodArray`, `isZodBoolean`, … helpers are removed.

**What changed.** Options and arguments declare their `type` with the `t` descriptors from
[`args-minus`](/clibuilder/packages/args-minus/). Constraints go in an options bag, not a chain.
There are no built-in formats: validation goes in `.check()`, which takes a function or any
[Standard Schema](https://standardschema.dev). A conversion that reads files, resolves paths, calls
the network or depends on other options moves into `run()` and throws a `CliError`.

**Who is affected.** Every CLI that imports `z` or an `isZod*` helper from `clibuilder`.

**Fix.** Run the codemod. It rewrites these forms:

| zod | `t` |
| --- | --- |
| `z.string()`, `z.number()`, `z.boolean()` | `t.string()`, `t.number()`, `t.boolean()` |
| `z.number().int()` | `t.int()` |
| `z.number().min(a).max(b)` | `t.number({ min: a, max: b })` |
| `z.string().regex(r)` | `t.string({ pattern: r })` |
| `z.literal(x)`, `z.enum([…])` | `t.literal(x)`, `t.enum([…])` |
| `z.union([z.literal('a'), z.literal('b')])` | `t.enum(['a', 'b'])` |
| `z.array(x)` | `t.array(x)` |
| `z.optional(x)`, `x.optional()` | `x.optional()` |

It flags everything else, such as `z.string().email()`, `z.coerce`, `.transform()`, `.default()`
and zod type annotations, for you to rewrite by hand:

```ts
// before
import { z } from 'clibuilder'

const FORMAT_OPTION: { type: z.ZodOptional<z.ZodEnum<['text', 'json']>> } = {
	type: z.optional(z.enum(['text', 'json']))
}
options: {
	port: { type: z.number().int().min(1).max(65535) },
	email: { type: z.string().email() }
}

// after
import { t } from 'clibuilder'
import { z } from 'zod' // your own dependency, for .check() only

const FORMAT_OPTION = { type: t.enum(['text', 'json']).optional() }
options: {
	port: { type: t.int({ min: 1, max: 65535 }) },
	email: { type: t.string().check(z.email()) }
}
```

**What else changes with it.** These zod behaviours do not carry over, so check your tests and any
script that calls your CLI:

- A boolean option takes no value after it. `--dry false` leaves `false` as a positional; write
  `--dry=false`. This applies to an option declared without a `type` too, and to the global flags
  such as `--verbose`.
- An array option takes one value per occurrence. Write `--tag a --tag b`; in `--tag a b`, `b` is a
  positional.
- An option that is neither `.optional()` nor given a `default` must be passed. zod typed it as
  present but did not enforce it; `t` reports a missing one as a usage error. Add `.optional()` where
  the option may be left out.
- A single-valued option given twice is an `expect-single` usage error and gets no value. zod also
  used the last value.
- `z.coerce`, `.transform()` and `.default()` inside an option `type` have no `t` form. Convert with
  `t.custom(raw => value)`, put the default in the option's `default`, and keep validation in
  `.check()`, whose schema output is ignored.
- `t.number()` is strict: an empty string, `Infinity` or trailing text is an invalid value.
- Usage error messages use the `args-minus` wording, such as `expected a number`, and an
  `invalid-value` error carries `keyKind` and `constraint`. `cli.UsageError`'s `keyType`, the zod
  type, is removed; read `keyKind`, the kind string.
- Help shows a value hint in the `t` form: `[--name <string>]` and `<file: string>` instead of
  `[--name=string]` and `<file=string>`.

Source: [slim-dependencies section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#34-design-c).
See [`t`](/clibuilder/api/t/).

## `config` takes a Standard Schema, and stores its output

**Shipped in 12.0.0.** A `z` schema from `clibuilder` no longer exists in 12.

**What changed.** A command's `config` takes any Standard Schema: zod 3.24 or later, zod 4, valibot,
arktype and others. `this.config` is the schema's **output**, not the loaded input. Defaults are
filled in and transforms applied, and a zod `z.object()` strips the keys it does not declare. In
11, `this.config` held the loaded file as it was.

**Who is affected.** A command whose `config` is a `z` schema from `clibuilder`. A command that
reads a config key its schema does not declare.

**Fix.** Import the schema library as your own dependency. Declare every key you read, or keep the
unknown keys with your library's passthrough. Help builds its `Config:` section from the schema's
JSON Schema (`~standard.jsonSchema`), which zod 4 provides and zod 3 does not, so a zod 3 config has
no `Config:` section in help.

```ts
// before
import { z } from 'clibuilder'
config: z.object({ name: z.string() })

// after
import { z } from 'zod'
config: z.object({ name: z.string(), extra: z.string().optional() })
```

Source: [slim-dependencies section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#34-design-c).
See [Configuration](/clibuilder/guides/configuration/).

## `js-yaml` is an optional peer dependency

**Shipped in 12.0.0.**

**What changed.** `clibuilder` no longer installs `js-yaml`. It loads it only when it reads a
`.yaml` or `.yml` config file. Without it, reading one fails with a `CliError` whose code is
`missing-peer-dependency`.

**Who is affected.** A CLI whose users write their config in YAML.

**Fix.** Add `js-yaml` to the CLI's own dependencies:

```sh
npm install js-yaml
```

Source: [slim-dependencies section 5.2](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#52-config-loading).
See [Configuration](/clibuilder/guides/configuration/).

## standard-log is removed

**Shipped in 12.0.0.**

**What changed.** `clibuilder` no longer depends on standard-log and standard-log-color. Every CLI
writes through a built-in UI to `cli({ streams: { stdout, stderr } })`, which defaults to
`process.stdout` and `process.stderr`. `--verbose`, `--silent` and `--debug-cli` work as before, and
`testCommand()` still returns `messages`, one line per message. Two things differ from 11.5.0:

- `error` is red and `warn` is yellow only when the stream is a TTY, following `NO_COLOR` and
  `FORCE_COLOR`. In 11.5.0 the colour codes were written to pipes and files too.
- clibuilder's own messages, such as those `--debug-cli` shows, no longer start with `clibuilder`.

**Who is affected.** A script or a test that matched the colour codes or the `clibuilder` prefix in
captured output. No surveyed CLI imports standard-log.

**Fix.** Match the plain message text.

```ts
// before
expect(stderr).toContain('\u001b[31mclibuilder failed')

// after
expect(stderr).toContain('failed')
```

Source: [slim-dependencies section 4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#4-logging-standard-log-and-standard-log-color).
See [Streams and output](/clibuilder/api/cli/#streams-and-output).

## `testCommand` is only in `clibuilder/testing`

**Shipped in 12.0.0.**

**What changed.** The root entry no longer exports `testCommand()`. Import it from
`clibuilder/testing`, which 11.5.0 already has. `testCommand(command, argv, options?)` takes one
`options` object, `{ config, output, format }`, where 11.5.0 took `(command, argv, config?, options?)`,
and it also runs a `.default()` command. `clibuilder/testing` also exports `mockPluginContext()` and
`mockExtensionContext()`. Nothing that the root entry imports reaches test-only code, so a CLI
no longer loads the test helper and its in-memory streams when it starts.

**Who is affected.** A test that imports `testCommand` from `clibuilder`, such as repobuddy/buddy's
specs. 11.5.0 marks that export deprecated.

**Fix.** Import it from `clibuilder/testing`, and pass the config as `options.config`. The codemod does both.

```ts
// before
import { command, testCommand } from 'clibuilder'

// after
import { command } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'
```

Source: [slim-dependencies section 5.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#51-trivial-removals-no-api-change).
See [`testCommand()`](/clibuilder/api/test-command/).

## ESM-only

**Shipped in 12.0.0.**

**What changed.** `clibuilder`, `@clibuilder/plugins` and `@clibuilder/axi` no longer publish a
CommonJS build. Each entry point in `exports` is `{ types, default }` and points at the ES module in
`esm/`; the `import` and `require` conditions and the top-level `main` field are gone. `require()`
keeps working: Node.js 20.19 and newer, the `engines` floor, load an ES module through
`require(esm)`, so `require('clibuilder')`, `require('clibuilder/testing')` and the other entry
points return the same exports as `import` does.

**Who is affected.**

- Tests run by Jest's CommonJS runtime, without its ESM support. That runtime cannot load an ES
  module. The 11.5.0 CJS build bundled its dependencies, so Jest could load it.
- A CLI run on Node.js older than 20.19, where `require()` cannot load an ES module. `engines`
  requires 20.19 or newer.
- A CommonJS file type checked with `module: node16`, or with `module: nodenext` before TypeScript
  5.8. TypeScript reports error TS1479, an ES module cannot be imported with `require`. 11.5.0 shipped
  ESM declarations too, so the same setup reported the same error before.

**Fix.**

- Jest: run it with ESM support, or move the tests to a runner that loads ES modules, such as Vitest
  or `node --test`.
- Node.js: upgrade to 20.19 or newer.
- TypeScript: use TypeScript 5.8 or newer with `module: nodenext`.

A CommonJS CLI needs no change:

```js
// before and after
const { cli, t } = require('clibuilder')
const { testCommand } = require('clibuilder/testing')
```

Source: [slim-dependencies section 5.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#54-build-output).
See [Installation](/clibuilder/getting-started/installation/#module-formats).

## Config loads through `.use(config())`

**Shipped in 12.0.0.**

**What changed.** The `config` option of `cli()` is removed. Config loading is an extension from
the `clibuilder/config` subpath. A CLI without `.use(config())` contains no config loader, no
find-up and no parsers. The config functions and types moved to the same subpath: `lookupConfig`,
`resolveConfig`, `loadConfig`, `readConfigFile`, `getConfigFilenames`, `getConfigFormat`,
`describeConfigSource`, `ConfigFormat`, `ConfigLoadResult`, `ConfigLookupResult` and `ConfigSource`.
The root `clibuilder` export no longer has them.

`.use(config())` gives the CLI the global `--show-config` option, the validation of each command's
`config` schema before `run()`, and `this.config`. A command without a schema reads the config as
loaded. The config is resolved on the first `parse()`, not when `cli()` is called.

**Who is affected.** A CLI that sets `config`, and code that imports a config function from
`clibuilder`. The codemod rewrites both, rule `config`. It flags a `config` value it cannot read, such as a
variable, with a `TODO(clibuilder-12)` comment.

**Fix.** Replace the option with the extension, and import from `clibuilder/config`.

| Before | After |
| --- | --- |
| `cli({ name, version, config: true })` | `cli({ name, version }).use(config())` |
| `cli({ name, version, config: 'other' })` | `cli({ name, version }).use(config({ name: 'other' }))` |
| `import { resolveConfig } from 'clibuilder'` | `import { resolveConfig } from 'clibuilder/config'` |

```ts
// before
cli({ name: 'my-cli', version: '1.0.0', config: true })

// after
import { config } from 'clibuilder/config'
cli({ name: 'my-cli', version: '1.0.0' }).use(config())
```

Add `.use(config())` before the `.command()` and `.default()` calls that declare `config`. A
`.command()` or `.default()` that declares `config` before `.use(config())`, or on a CLI without it,
is a type error. A sub-command or a command an extension adds is checked at run time instead, and
fails with:

```
Error: command 'x' declares config, but the cli does not load config. Add .use(config()) from 'clibuilder/config' to the cli.
```

Run the codemod with `npx @clibuilder/codemod`, as in [Run the codemod first](#run-the-codemod-first).

## Plugins move to `@clibuilder/plugins`

**Shipped in 12.0.0.**

**What changed.** Core no longer loads plugins from `config`, the `keywords` option and
`this.keywords` are removed, and core no longer adds the `plugins` command group. A CLI loads
plugins with `.use(plugins())` from `@clibuilder/plugins`, which needs `clibuilder` 12.

**Who is affected.** A CLI that sets `config` or `keywords` and loads plugins, such as
repobuddy/buddy. For such a CLI, adding `plugins()` is required: without it the plugins stop
loading, and `clibuilder` 12 warns once. The codemod rewrites `keywords` to
`plugins({ keywords })`. It does not add `plugins()` for `config` alone, because it cannot tell
whether the CLI loads plugins; rerun it with `--add-plugins` if it does. Either rewrite also adds
`@clibuilder/plugins` to `package.json`.

**Fix.** Add `.use(config()).use(plugins())`, config first: `plugins()` reads the `plugins` key
from the config that `config()` resolved.

```ts
// before
cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })

// after
import { config } from 'clibuilder/config'
import { plugins } from '@clibuilder/plugins'
cli({ name: 'my-cli', version: '1.0.0' }).use(config()).use(plugins({ keywords: ['my-cli-plugin'] }))
```

The details, including what stays in core, are in
[Moving from the plugin support in `clibuilder` 11](/clibuilder/packages/plugins/#moving-from-the-plugin-support-in-clibuilder-11).

## `@clibuilder/axi` moves into `clibuilder`

**Shipped in 12.0.0.**

**What changed.** `@clibuilder/axi` 0.3.0 is the last release, and the package is deprecated on npm. Its value helpers are in the
[`clibuilder/axi`](/clibuilder/api/axi/) subpath: `truncateText`, `truncateList`,
`defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader` and `collapseHome`, with `exitCodes`,
`result`, `document` and `empty`. Its output, error, format and usage parts are built into core.
0.3.0 keeps deprecated copies of the value helpers with the same behavior.

**Who is affected.** Every CLI that imports `@clibuilder/axi`.

**Fix.** Import the value helpers from `clibuilder/axi`, and replace the rest with the core
features in the sections above. The codemod moves the value helpers and flags the rest.

```ts
// before
import { createOutput, formatOption, truncateList } from '@clibuilder/axi'

// after
import { truncateList } from 'clibuilder/axi'
// createOutput: return the value, or result(value, { help, render })
// formatOption: read this.format
```

Source: [axi-native section 4.1](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#41-decision-where-clibuilderaxis-contents-belong).

## Exit codes are 0, 1 and 2

**Shipped in 12.0.0.**

**What changed.** Core uses three exit codes: 0 for success, 1 for a failure, and 2 for a usage
error. `CliError.exitCode` accepts any integer from 1 to 255, and 0 is rejected. Neither core nor
`clibuilder/axi` names codes above 2. The exit code says *whether* it failed; the `code` string on
the error says *which* failure.

**Who is affected.** A CLI that passes `exitCode: 0`, or a value outside 1 to 255.

**Fix.** Use your own codes from 3 upwards, and put the meaning in `code`.

```ts
// before
throw new CliError('not logged in', { exitCode: 0 })

// after
throw new CliError('not logged in', { code: 'auth-required', exitCode: 3 })
```

Source: [axi-native section 3.6](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#36-exit-codes-stop-at-012-6396).

## A bare `--version` is answered first

**Available in 11.5.0.**

**What changed.** When `--version` or `-v` is the only argument, core prints the version as plain
text before the config loads and before plugins and extensions run. Any other invocation, such as
`my-cli sub --version`, takes the normal path.

**Who is affected.** A CLI whose own `-v` or `--version` option, from a plugin or an extension, used
to answer a bare `my-cli -v`.

**Fix.** Give that option a different name, or call it on a command: `my-cli sub -v`.

```sh
# before: a plugin's -v answered
my-cli -v

# after: core answers a bare -v; the plugin's option needs its command
my-cli sub -v
```

Source: [axi-native section 3.8](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#38-no-version-fast-path-6398).

## Global options may come before the command

**Shipped in 12.0.0.**

**What changed.** `--help`, `--version`, `--verbose`, `--silent`, `--debug-cli`, `--show-config`
and `--format` may come before the command, after it, or between a group and its sub-command. A
command's own options still go after the command.

**Who is affected.** A CLI whose default command takes an argument. `my-cli --verbose deploy` used
to pass `deploy` to the default command; it now runs the `deploy` command.

**Fix.** Put the argument first when you mean the default command: `my-cli deploy --verbose`.

```sh
# before: deploy was the default command's argument
my-cli --verbose deploy

# after: the same call runs the deploy command; for the default command, write
my-cli deploy --verbose
```

Source: [axi-native section 3.2](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#32-usage-errors-cannot-honour---format-6392).
