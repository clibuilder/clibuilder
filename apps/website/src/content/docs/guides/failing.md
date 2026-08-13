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

The global options — `--help`, `--version`, `--verbose`, `--silent`, `--debug-cli` and
`--show-config` — are accepted by every command, so they are never reported as unknown. `--help` and
`--version` are answered even when the rest of the command line is invalid, and both exit `0`:
asking for help is not a usage error.

## Failing from a command

Throw `CliError` from `run()`. clibuilder prints the message through the command's `ui`, prints the
help lines after it, and exits with the code you chose. `parse()` resolves to `undefined` instead of
rejecting, so the failure is reported to the user rather than surfacing as an unhandled rejection
with a stack trace.

```ts
import { CliError, command, exitCodes, z } from 'clibuilder'

const fields = ['name', 'version', 'description']

export const view = command({
  name: 'view',
  description: 'show a package',
  options: { fields: { description: 'fields to show', type: z.optional(z.array(z.string())) } },
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
| `exitCode` | `number` | The code the cli exits with. Defaults to `exitCodes.error` (1). |
| `help` | `string \| string[]` | What the caller should do about it. Printed after the message, one line each. |
| `cause` | `unknown` | The underlying error, kept for the caller to inspect. |

Use `exitCodes.usage` when the invocation itself was wrong — a value your schema could not have
caught, such as an option value that is only valid for certain other values. Use the default for
everything else: a network call that failed, a file that was not there, a build that did not
succeed.

Any other error thrown from `run()` is a defect rather than a reported failure, so it keeps
propagating out of `parse()` untouched.

## Asserting on failures in tests

`testCommand()` reports the exit code alongside the result and the messages, and no process is
harmed:

```ts
import { testCommand } from 'clibuilder'

test('view rejects an unknown field', async () => {
  const { exitCode, messages } = await testCommand(view, 'view --fields bogus')

  expect(exitCode).toBe(2)
  expect(messages).toContain('unknown field: bogus')
})
```

`exitCode` is `undefined` when the command did not fail — the same as a process that exits `0`.
