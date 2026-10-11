---
title: Upgrading from clibuilder 11 to 12
description: "What clibuilder 12 changes for a CLI author, in the order you upgrade, with the one-line fix for each change and a codemod for the mechanical parts."
---

`clibuilder` 12 is unreleased. This page describes what it changes for a CLI built on `clibuilder`
11.5.0, and how to upgrade. It covers both RFCs that set the design of 12:

- [axi-native](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md): output
  modes, formats, errors, help and exit codes.
- [slim-dependencies](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md):
  `t` instead of zod, config, logging and plugins.

The RFCs are the authority. Where this page differs from them, they win.

Each section says what changed, who is affected, the one-line fix, and shows the code before and
after. Each section also has one of these labels:

- **On `main`**: the code is merged and ships in 12. You can try most of it in a v11 CLI that sets
  `cli({ output: 'axi' })`.
- **Pending**: the RFC decides it, but the change is not merged yet. The section describes the
  target behaviour from the RFC, and the details can still change in its pull request.

[The roadmap](/clibuilder/roadmap/v12/) tracks the status of each change.

## Run the codemod first

The codemod rewrites what it can, and marks what it cannot:

```sh
npx @clibuilder/codemod --dry-run src
npx @clibuilder/codemod src
```

`@clibuilder/codemod` is not published to npm yet. Until it is, build it from
[`packages/codemod`](https://github.com/clibuilder/clibuilder/tree/main/packages/codemod) in this
repository and run `node packages/codemod/esm/bin.js`.

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
| `cli({ config })` | flagged; with `--add-plugins`, rewritten to add `.use(plugins())` |
| `this.keywords` | flagged |
| `return <expr>` in `run()` | listed for review |

When it adds an import from `@clibuilder/plugins`, it also adds the package to the nearest
`package.json`. Run your package manager's install afterwards. Running the codemod twice does not
change the result of the first run.

## Output modes: `axi` is the default

**On `main`:** `cli({ output: 'axi' | 'console' })` and both modes. **Pending:** `axi` as the
default.

**What changed.** `clibuilder` 12 has two output modes, and `axi` becomes the default. Both modes
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

Source: [axi-native section 3.10](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#310-output-modes-and-stream-routing).

## `ui.*` writes to stderr

**On `main`** under `output: 'axi'`. **Pending:** as the default.

**What changed.** In `axi` mode every `ui` call is a diagnostic on stderr, including `ui.info`.
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

**On `main`** under `output: 'axi'`. **Pending:** as the default.

**What changed.** A value other than `undefined` returned from `run()` is printed on stdout, encoded
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

**On `main`:** the fields, and the rendering under `output: 'axi'`. **Pending:** the rendering as
the default.

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

**On `main`** under `output: 'axi'`. **Pending:** as the default.

**What changed.** In `axi` mode only the top-ranked usage error is reported, on stdout, in the
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

**On `main`** under `output: 'axi'` or `cli({ format })`. **Pending:** on for every CLI.

**What changed.** Every command accepts `--format <toon|json|text>`, and `run()` reads the resolved
value from `this.format`. The default is `toon`; change it with `cli({ format: 'text' })`. `-f` is
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

**On `main`:** `--help` and `--version` as answers under `output: 'axi'`, command `examples`, and
structured help. `ui.showHelp()` and `ui.showVersion()` are deprecated. **Pending:** their removal
from `ui`.

**What changed.** Core answers `--help` on stdout, following `--format`: text help under `text`,
and the structured help under `toon` and `json`. `--version` is plain text in every format.
`showHelp` and `showVersion` leave `ui`, which now carries only diagnostics.

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

## zod is replaced by `t`

**On `main`:** `t` re-exported from `clibuilder` (released in 11.5.0), and `z` deprecated.
**Pending:** the removal of `z` and zod.

**What changed.** Options and arguments declare their `type` with the `t` descriptors from
[`args-minus`](/clibuilder/packages/args-minus/). Constraints go in an options bag, not a chain.
There are no built-in formats: validation goes in `.check()`, which takes a function or any
[Standard Schema](https://standardschema.dev). A conversion that reads files, resolves paths, calls
the network or depends on other options moves into `run()` and throws a `CliError`.

**Who is affected.** Every CLI that imports `z` from `clibuilder`.

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

Source: [slim-dependencies section 3.4](https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/slim-dependencies.md#34-design-c).
See [Using `t` in clibuilder](/clibuilder/packages/args-minus/#using-t-in-clibuilder).

## `config` takes a Standard Schema, and stores its output

**On `main`.** The `z` schemas stop working when zod is removed (pending).

**What changed.** A command's `config` takes any Standard Schema: zod 3.24 or later, zod 4, valibot,
arktype and others. `this.config` is the schema's **output**, not the loaded input. Defaults are
filled in and transforms applied, and a zod `z.object()` strips the keys it does not declare. In
11, `this.config` held the loaded file as it was.

**Who is affected.** A command whose `config` is a `z` schema from `clibuilder`. A command that
reads a config key its schema does not declare.

**Fix.** Import the schema library as your own dependency. Declare every key you read, or keep the
unknown keys with your library's passthrough.

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

## standard-log is removed

**On `main`.**

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

## Plugins move to `@clibuilder/plugins`

**On `main`.**

**What changed.** Core no longer loads plugins from `config`, the `keywords` option and
`this.keywords` are removed, and core no longer adds the `plugins` command group. A CLI loads
plugins with `.use(plugins())` from `@clibuilder/plugins`, which needs `clibuilder` 12.

**Who is affected.** A CLI that sets `config` or `keywords` and loads plugins, such as
repobuddy/buddy. For such a CLI, adding `plugins()` is required: without it the plugins stop
loading, and `clibuilder` 12 warns once. The codemod rewrites `keywords` to
`plugins({ keywords })`. It flags `config` alone, because it cannot tell whether the CLI loads
plugins; rerun it with `--add-plugins` if it does. Either rewrite also adds `@clibuilder/plugins`
to `package.json`.

**Fix.** Add `.use(plugins())`.

```ts
// before
cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })

// after
import { plugins } from '@clibuilder/plugins'
cli({ name: 'my-cli', version: '1.0.0', config: true }).use(plugins({ keywords: ['my-cli-plugin'] }))
```

The details, including what stays in core, are in
[Moving from the plugin support in `clibuilder` 11](/clibuilder/packages/plugins/#moving-from-the-plugin-support-in-clibuilder-11).

## `@clibuilder/axi` moves into `clibuilder`

**On `main`.**

**What changed.** `@clibuilder/axi` has no further development. Its value helpers are in the
[`clibuilder/axi`](/clibuilder/api/axi/) subpath: `truncateText`, `truncateList`,
`defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader` and `collapseHome`, with `exitCodes`,
`result`, `document` and `empty`. Its output, error, format and usage parts are built into core.

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

**On `main`.**

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

**On `main`**, released in 11.5.0.

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

**On `main`.**

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
