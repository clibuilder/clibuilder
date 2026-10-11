---
title: Arguments & Options
description: Declare positional arguments and named options with `t`, and get run(args) typed from the declaration.
---

Arguments and options are declared on the command, and the type of `run(args)` is inferred from that
declaration. Nothing else needs to be written down.

## Arguments

Arguments are positional, matched in the order they are declared. `name` and `description` are
required; `type` defaults to string.

```ts
import { cli, t } from 'clibuilder'

cli({ name: 'app', version: '1.0.0' }).default({
  arguments: [
    { name: 'name', description: 'your name' }
  ],
  run(args) {
    // args.name: string
    this.ui.info(`hello, ${args.name}`)
  }
})
```

An argument typed as an **array** is variadic — it collects every remaining positional value:

```ts
cli({ name: 'app', version: '1.0.0' }).command({
  name: 'cat',
  description: 'print files',
  arguments: [
    { name: 'files', description: 'files to print', type: t.array(t.string()) }
  ],
  run(args) {
    // args.files: string[]
    for (const file of args.files) this.ui.info(file)
  }
})
```

```sh
$ app cat a.txt b.txt c.txt
```

:::note
Argument values are converted to the declared type, just like options. `type: t.number()` gives you
a real `number` in `run()`, and a value that doesn't fit is a usage error.

A `t.array()` argument is variadic: it consumes the remaining positional arguments.
:::

## Options

Options are declared as a record keyed by option name. `description` is required; `type` defaults to
`boolean | undefined`, which is what you want for an optional flag.

```ts
cli({ name: 'app', version: '1.0.0' }).default({
  options: {
    'no-progress': { description: 'disable progress bar' }
  },
  run(args) {
    // args['no-progress']: boolean | undefined
    if (args['no-progress']) this.ui.info('progress bar disabled')
  }
})
```

:::note
A flag declared without a `type` behaves like `type: t.boolean().optional()` would: `args.flag` is `true`
when the flag is present and `undefined` when it is not. Passing a non-boolean value to it
(`--flag=somevalue`) is a usage error — declare `type: t.string()` if you want to accept one.
:::

Option values are converted to the declared type, and a value that doesn't fit is a usage error.

```ts
options: {
  port: { description: 'port to listen on', type: t.int({ min: 1, max: 65535 }) }
}
```

```sh
$ app --port=3000     # args.port === 3000
$ app --port=abc      # usage error: invalid value for --port
```

### Aliases

```ts
options: {
  project: { description: 'project directory', alias: ['p'] }
}
```

```sh
$ app -p ./packages/core
$ app --project ./packages/core
$ app --project=./packages/core
```

Single-character options bundle: `-abc` sets `a` and `b` to `true` and gives `c` the following value.
An alias can be hidden from the help message:

```ts
options: {
  project: { description: 'project directory', alias: ['p', { alias: 'proj', hidden: true }] }
}
```

### Defaults

`default` supplies the value when the option is absent.

```ts
options: {
  port: { description: 'port to listen on', type: t.int(), default: 3000 }
}
```

### Conflicting options

`conflicts` names the options this one cannot be used with.

```ts
options: {
  full: { description: 'print the whole file', conflicts: ['lines'] },
  lines: { description: 'lines to print', type: t.int(), alias: ['n'], default: 10 }
}
```

```sh
$ app --full -n 20
error: option --full cannot be used with option -n
code: conflicting-options
option: "--full"
conflictsWith: "-n"
help[1]: "Usage: app [options]"
```

Passing both is a [usage error](/clibuilder/guides/failing/#usage-errors) (exit code 2). The output
above is the default `output: 'axi'` of `clibuilder` 12 (unreleased). With `output: 'console'`, and
in 11.5.0, it is the line `option --full cannot be used with option -n`, reported with the other
parse errors.
A default value does not count as passed, so `app --full` is valid here.
The conflict applies in both directions, and the help message lists it on both options.

### Repeating an option

An array-typed option takes one value per occurrence and accumulates them:

```ts
options: {
  tag: { description: 'a tag', type: t.array(t.string()) }
}
```

```sh
$ app --tag=a --tag=b     # args.tag === ['a', 'b']
$ app --tag a --tag b     # the same
```

`--tag a b` does not work: `b` is a positional argument, not a second tag.

A non-array option given more than once is a usage error, rather than silently keeping the last one.

## Required and optional values

An option declared with a `type` is required unless it is `.optional()` or has a `default`. A missing
one is a usage error, as is a missing argument. Both print the help message. An option without a
`type` is still an optional flag.

```ts
cli({ name: 'app', version: '1.0.0' }).default({
  arguments: [
    { name: 'a', description: 'an optional name', type: t.string().optional() }
  ],
  options: {
    y: { description: 'an optional number', type: t.number().optional() },
    port: { description: 'port with a default', type: t.int(), default: 3000 }
  },
  run(args) {
    // args.a: string | undefined
    // args.y: number | undefined
    // args.port: number
  }
})
```

## Supported types

See [`t`](/clibuilder/api/t/) for every builder. The common ones:

| Declaration | `args` type | Argument | Option |
| --- | --- | --- | --- |
| *(omitted)* | `string` / `boolean \| undefined` | The default, a string | The default, an optional flag |
| `t.string()` | `string` | yes | yes |
| `t.number()`, `t.int()` | `number` | yes | yes |
| `t.boolean()` | `boolean` | yes | `--flag` or `--flag=false`, no separate value |
| `t.enum([...])`, `t.literal(v)` | the values | yes | yes |
| `t.array(t.string())` | `string[]` | variadic | one value per occurrence |
| `t.custom(fn)`, `t.json()` | what `fn` returns, `unknown` | yes | yes |
| `.optional()` | `T \| undefined` | optional | optional |

Add a constraint with the builder's options, such as `t.int({ min: 1 })`, or with
`.check(fnOrStandardSchema)`. A check from a library comes from your own dependency:

```ts
import { z } from 'zod'

options: {
  email: { description: 'who to notify', type: t.string().check(z.email()) }
}
```

The constraint shows in the help message, such as `[--port <int 1..65535>]`, `[--tag <string>...]`
or `[ids: int >=1...]`.

:::note[v12, unreleased]
In `clibuilder` 11.5.0 the types come from zod's `z`. In `clibuilder` 12 these changed:

- A boolean option takes no value after it. `--flag false` no longer works. Write `--flag=false`.
- An array option takes one value per occurrence: `--tag a --tag b`, not `--tag a b`.
- An option declared without `.optional()` and without a `default` is required.

See [zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t).
:::

Option validation happens before `run()` is called. A value that fails its check, an unknown flag,
a missing required argument, or an extra positional argument all produce the same outcome: the CLI
reports a [usage error](/clibuilder/guides/failing/#usage-errors), exits `2`, and does not run the
command.

## Built-in options

Every command inherits these; you don't declare them, and you shouldn't shadow them.

| Flag | Alias | Effect |
| --- | --- | --- |
| `--help` | `-h` | Print the resolved command's help message |
| `--version` | `-v` | Print the CLI version |
| `--verbose` | `-V` | Display level `debug` |
| `--silent` | | Display level `none` |
| `--debug-cli` | | Display level `trace`, including clibuilder's own internal messages |
| `--format <toon\|json\|text>` | | **v12, unreleased.** The format to answer in. See [The global `--format` option](/clibuilder/api/cli/#the-global---format-option) |

`args.help` is always present in the inferred type for that reason.

From `clibuilder` 11.5.0, when `--version` or `-v` is the only argument, the CLI prints the version to stdout as plain text
and exits 0 before it loads its config, activates any plugin or runs any `.use()` extension, so a
broken config or a slow plugin cannot fail or delay it. Because nothing is loaded yet, a bare `-v`
is always the version, even if a plugin, an extension or the config declares a `-v` of its own. With anything else on the command line,
such as `my-cli deploy --version`, the version is answered after loading, as before.

**v12, unreleased:** with `output: 'axi'`, the default, `--help` follows `--format` and `--version`
is plain text in every format. See
[`--help` and `--version` with `output: 'axi'`](/clibuilder/api/cli/#--help-and---version-with-output-axi).

One more is added only when the CLI has `.use(config())` from `clibuilder/config`, since it would
have nothing to report otherwise:

| Flag | Alias | Effect |
| --- | --- | --- |
| `--show-config` | | Print the resolved config and the file it came from — see [Configuration](/clibuilder/guides/configuration/#inspecting-the-resolved-config) |

`run()` reads `--format` as `this.format`. Do not declare a `format` option of your own: it fails
the CLI at startup. In `clibuilder` 11.5.0 there is no global `--format`.

### Where the built-in options go

**Unreleased:** a built-in option may come before the command, after it, or between a group and its
sub-command. These run the same command:

```sh
my-cli deploy prod --verbose
my-cli --verbose deploy prod
my-cli --format json plugins list
my-cli plugins --format json list
```

A built-in option that takes a value, such as `--format json`, takes only that value, so the next
word still names the command. A command's own options go after the command: `my-cli --force deploy`
is a usage error that names `--force` as unknown. Words after `--` never name a command.

In `clibuilder` 11.5 and earlier, a built-in option before the command took the command name as its
value, so `my-cli --verbose deploy` was a usage error. If the default command takes an argument,
`my-cli --verbose deploy` used to give it `deploy`; it now runs the `deploy` command, as
`my-cli deploy` does.
