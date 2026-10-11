---
title: Failing
description: Exit codes, usage errors, and how a command reports that it could not do what was asked.
---

A cli that always exits `0` is a cli whose caller — a shell script, a CI job, an agent — cannot tell
whether it worked. clibuilder reports failures two ways: it rejects invocations it cannot make sense
of, and it gives your command a way to say it failed.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | The command did what was asked, including no-ops. |
| `1` | The command was called correctly but could not complete. |
| `2` | The command was called incorrectly — an unknown option, a missing argument, a value of the wrong type. |

The codes are exported as `exitCodes` so you do not have to remember the numbers:

```ts
import { exitCodes } from 'clibuilder'

exitCodes.success // 0
exitCodes.error   // 1
exitCodes.usage   // 2
```

This is the convention a caller driving your cli through a shell expects: `2` means *do not retry
this invocation, it is malformed*, while `1` means *the invocation was fine, the world was not*.

clibuilder sets `process.exitCode` rather than calling `process.exit()`, so pending writes to stdout
are never truncated — node exits with the recorded code once your cli is done.

## Usage errors

Anything the parser cannot reconcile with the command's `arguments` and `options` is reported by
name, followed by the command's help message, and the cli exits `2`:

```sh
$ my-cli deploy --dyr-run
unknown option --dyr-run

Usage: my-cli deploy <arguments> [options]
...
```

Every problem found is reported, not just the first:

```sh
$ my-cli deploy --bogus
unknown option --bogus
missing required argument <target>
```

A command group — a command that has `commands` but no `run`, including a cli with no `default()` —
is incomplete without a sub command. Invoked bare, it prints its help and exits `2`:

```sh
$ my-cli send
Usage: my-cli send <command>
...
```

The global options — `--help`, `--version`, `--verbose`, `--silent`, `--debug-cli` and
`--show-config` — are accepted by every command, so they are never reported as unknown. `--help` and
`--version` are answered even when the rest of the command line is invalid, and both exit `0`:
asking for help is not a usage error.

### Usage errors with `output: 'axi'`

:::note[Unreleased]
On `main`, not in a published release. It ships in `clibuilder` 12.
:::

The above is the default [`output: 'console'`](/clibuilder/api/cli/#streams-and-output). With
`cli({ output: 'axi' })` and no [`onUsageError`](#reporting-usage-errors-yourself) handler, clibuilder
reports a usage error as one coded error on stdout, in the caller's
[`--format`](/clibuilder/api/cli/#the-global---format-option), else the CLI's `format`. It writes
nothing to stderr, prints no help, and exits `2`:

```sh
$ my-cli deploy prod --port 70000
error: "invalid value for option --port: expected an integer from 1 to 65535, received \"70000\""
code: invalid-value
option: "--port"
value: "70000"
help[2]: "Usage: my-cli deploy <arguments> [options]","expected for --port: int 1..65535 (received \"70000\")"
```

Only the first error is reported, ranked in this order: unknown option, conflicting options, invalid
value, expect single, missing argument, extra arguments. A mistyped option often causes the errors
after it, such as a value it swallowed being reported as a missing argument.

| `code` | Fields | `help` after the usage line |
| --- | --- | --- |
| `unknown-option` | `option` | the command's options |
| `conflicting-options` | `option`, `conflictsWith` | none |
| `invalid-value` | `option` or `argument`, `value` (as typed) | `allowed for --level: low, high (received "x")` for a `t.enum` or `--format`, else the constraint of a `t` declaration, such as `int 1..65535` or `string /^v\d+$/` |
| `expect-single` | `option` or `argument`, `value` | none |
| `missing-argument` | `argument`, or `option` for a required `t` option | the command's arguments, or its options |
| `extra-arguments` | `arguments` | the command's arguments, or a group's commands |
| `missing-command` | `command` | the group's commands |

`missing-command` is a command group invoked bare. A config that fails the command's schema is
reported the same way, with code `invalid-config`, the messages for each failing key as fields, and
exit code `1`. Neither prints the help.

An `onUsageError` handler, on `cli()` or on a command, still takes over. `@clibuilder/axi`'s
`createUsageErrorHandler()` writes the same fields, except that it joins every error into one
message, codes an extra argument `unexpected-argument`, and has no usage line, `option`, `argument`
or `value` fields.

### Reporting usage errors yourself

To choose the format, the stream, and whether help is printed, declare an `onUsageError` handler.
clibuilder then prints nothing for usage errors. It calls the handler with the structured errors, the
matched command, and that command's `ui`. To cover the whole cli, pass the handler to `cli()`:

```ts
import { cli } from 'clibuilder'

cli({
  name: 'my-cli',
  version: '1.0.0',
  onUsageError(errors, { command }) {
    const flags = Object.keys(command.options ?? {}).map((k) => `--${k}`)
    for (const e of errors) {
      if (e.type === 'invalid-key') {
        process.stdout.write(`${JSON.stringify({ code: 'unknown-flag', flag: `--${e.key}`, flags })}\n`)
      } else {
        process.stdout.write(`${JSON.stringify({ code: e.type })}\n`)
      }
    }
  }
})
```

Each error is a `cli.UsageError`, identified by its `type`:

| `type` | `code` (Unreleased) | Fields |
| --- | --- | --- |
| `invalid-key` | `unknown-option` | `key`: the unknown option, without dashes |
| `conflicting-options` | `conflicting-options` | `key`, `conflictsWith`: the two options, as typed |
| `missing-argument` | `missing-argument` | `name`: the argument |
| `extra-arguments` | `extra-arguments` | `name`, `values`: the arguments nothing declared |
| `invalid-value` | `invalid-value` | `key`, `value`, `message` |
| `expect-single` | `expect-single` | `key`, `value`, `keyKind` |

`command` is the command the invocation matched, with its declared `arguments` and `options`. Call
`ui.showHelp()` to print that command's help.

:::note[Unreleased: `code`, `format` and `exitCode`]
On `main`, for the next `clibuilder` 11 minor:

- Each error also has `code`, a stable kebab-case string. It is the same as `type`, except that
  `invalid-key` is `unknown-option`. Branch on `code` in new handlers: it is the name `clibuilder` 12
  reports. In 11 it is not enumerable, so `JSON.stringify(error)` and equality checks give what they
  did before.
- The second argument also has `format`, the format the cli reports in, and `exitCode`, the code the
  cli exits with when the handler returns none (`exitCodes.usage`, `2`). `format` is the caller's
  [`--format`](/clibuilder/api/cli/#the-global---format-option) when the global option is on, else
  the CLI's [`cli({ format })`](/clibuilder/api/cli/#options) value, `'toon'` by default. A bad
  `--format` value is itself one of the errors, an `invalid-value` with `allowed`, and `format` is then
  the CLI's default.
- The global options are read before the handler runs. `--silent` and `--verbose` are already applied
  to the `ui` it receives, and a malformed global flag, such as `--verbose=maybe`, is one of the
  errors, reported once as an `invalid-value`.

```ts
cli({
  name: 'my-cli',
  version: '1.0.0',
  onUsageError(errors, { format, exitCode }) {
    const [e] = errors
    process.stdout.write(format === 'json' ? `${JSON.stringify({ code: e.code })}\n` : `code: ${e.code}\n`)
    return exitCode
  }
})
```
:::

A command can declare its own handler. It covers that command and its sub-commands. clibuilder calls
exactly one handler, the first it finds in this order:

1. the matched command's own handler;
2. the handler of the nearest command that contains it;
3. the handler passed to `cli()`.

If none is found, clibuilder prints the errors and the help as described above.

This is how a plugin keeps its error format in any cli that loads it with
[`@clibuilder/plugins`](/clibuilder/packages/plugins/). Declare the handler on the
plugin's group command:

```ts
import type { PluginActivationContext } from '@clibuilder/plugins'
import { list, send } from './commands.js'

export function activate(ctx: PluginActivationContext) {
  ctx.addCommand({
    name: 'mux',
    onUsageError(errors) {
      for (const e of errors) process.stdout.write(`${JSON.stringify({ code: e.type })}\n`)
    },
    commands: [send, list]
  })
}
```

The cli still exits `2`. To exit with another code, return it from the handler. If the handler throws,
`parse()` rejects with that error.

## Failing from a command

Throw `CliError` from `run()`. clibuilder prints the message through the command's `ui`, prints the
help lines after it, and exits with the code you chose. `parse()` resolves to `undefined` instead of
rejecting, so the failure is reported to the user rather than surfacing as an unhandled rejection
with a stack trace.

```ts
import { CliError, command, exitCodes, t } from 'clibuilder'

const fields = ['name', 'version', 'description']

export const view = command({
  name: 'view',
  description: 'show a package',
  options: { fields: { description: 'fields to show', type: t.array(t.string()).optional() } },
  async run(args) {
    const unknown = (args.fields ?? []).filter((f) => !fields.includes(f))
    if (unknown.length > 0) {
      throw new CliError(`unknown field: ${unknown.join(', ')}`, {
        exitCode: exitCodes.usage,
        help: `valid fields: ${fields.join(', ')}`
      })
    }
    // ...
  }
})
```

`CliError` takes:

| Option | Type | Description |
| --- | --- | --- |
| `exitCode` | `number` | The code the cli exits with. Defaults to `exitCodes.error` (1). **Unreleased:** any integer from 1 to 255; `0` and any other value throw a `RangeError`. |
| `code` | `string` | **Unreleased.** A stable kebab-case string that says which failure this is, such as `not-found`. Defaults to `error`. Anything else throws a `RangeError`. |
| `details` | `Record<string, scalar \| scalar[]>` | **Unreleased.** Extra fields an agent can act on, such as the name that was not found. Flat: each value is a string, number, boolean, `null`, or a list of them. A key may not be `error`, `code` or `help`. |
| `help` | `string \| string[]` | What the caller should do about it. Printed after the message, one line each. |
| `cause` | `unknown` | The underlying error, kept for the caller to inspect. |

The error carries them as `message`, `code`, `details`, `help` (always a list) and `exitCode`.

:::note[Unreleased: `code`, `details` and the report form]
`code`, `details`, `new CliError(report)`, the 1 to 255 range and `CliError.reported()` are on `main`
for the next `clibuilder` 11 minor, which is not published yet.
:::

You can also pass the whole report as one object:

```ts
throw new CliError({
  message: `no plugin named ${name}`,
  code: 'not-found',
  details: { name },
  help: 'run `my-cli plugins list` to see the installed plugins',
  exitCode: 4
})
```

The exit code says *success, failure, or usage error*. The `code` says *which failure*. Scripts
branch on the first and agents on the second. clibuilder uses only 0, 1 and 2; a CLI that wants its
own codes above 2, such as 3 for not found, sets them itself.

Use `exitCodes.usage` when the invocation itself was wrong — a value your schema could not have
caught, such as an option value that is only valid for certain other values. Use the default for
everything else: a network call that failed, a file that was not there, a build that did not
succeed.

Any other error thrown from `run()` is a defect rather than a reported failure, so it keeps
propagating out of `parse()` untouched.

### Errors with `output: 'axi'`

:::note[Unreleased]
On `main` for the next `clibuilder` 11 minor, which is not published yet.
:::

With the default [`output: 'console'`](/clibuilder/api/cli/#streams-and-output), clibuilder prints
the message and the help lines on stderr, as above. With `cli({ output: 'axi' })` the error is an
answer: clibuilder renders it once on stdout, and writes nothing to stderr for it. The fields are
flat, in this order: `error` (the message), `code`, the `details` fields, then `help`, which is left
out when empty. The encoding is the caller's
[`--format`](/clibuilder/api/cli/#the-global---format-option), else the CLI's
[`format`](/clibuilder/api/cli/#options), `toon` unless you set another:

```sh
$ my-cli plugins show foo
error: no plugin named foo
code: not-found
name: foo
help[1]: run `my-cli plugins list` to see the installed plugins
```

With `--format json` or `format: 'json'` the same error is one line of JSON, and with `text` it is
`key: value` lines. The keys are the ones `@clibuilder/axi` and
[axi-sdk-js](https://github.com/kunchenguid/axi) use. Under `--verbose`, a debugging copy of the
error, with its stack, is written to stderr as a `debug` line. The CLI exits with the error's
`exitCode`.

### An error already reported

`CliError.reported(exitCode)` is for a failure that something else already printed, such as
`@clibuilder/axi`'s `output.error()`. The CLI exits with `exitCode`, and prints nothing for it on
stdout or stderr, in either output, so the failure is not reported twice. It is
**Unreleased**, like the rest of this section.

## Asserting on failures in tests

`testCommand()` reports the exit code alongside the result and the messages, and no process is
harmed:

```ts
import { testCommand } from 'clibuilder/testing'

test('view rejects an unknown field', async () => {
  const { exitCode, messages } = await testCommand(view, 'view --fields bogus')

  expect(exitCode).toBe(2)
  expect(messages).toContain('unknown field: bogus')
})
```

`exitCode` is `undefined` when the command did not fail — the same as a process that exits `0`.
