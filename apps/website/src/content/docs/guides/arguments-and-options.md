---
title: Arguments & Options
description: Declare positional arguments and named options with zod, and get run(args) typed from the declaration.
---

Arguments and options are declared on the command, and the type of `run(args)` is inferred from that
declaration. Nothing else needs to be written down.

## Arguments

Arguments are positional, matched in the order they are declared. `name` and `description` are
required; `type` defaults to string.

```ts
import { cli, z } from 'clibuilder'

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
    { name: 'files', description: 'files to print', type: z.array(z.string()) }
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

:::caution[Arguments arrive as strings]
Positional argument values are **not** coerced to the declared type — only `z.optional()` (is it
required?) and `z.array()` (is it variadic?) change behavior. Declaring
`type: z.number()` on an argument makes `args.n` *typed* as `number`, but at runtime you get the raw
string `'42'`.

Use an **option** when you want a coerced non-string value, or convert the argument yourself:

```ts
arguments: [{ name: 'count', description: 'how many' }],
run(args) {
  const count = Number(args.count)
}
```
:::

## Options

Options are declared as a record keyed by option name. `description` is required; `type` defaults to
`boolean | undefined`, which is what you want for a flag.

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
A flag declared without a `type` is *typed* as `boolean | undefined`, but the value handed to `run()`
is the string `'true'` when the flag is present and `undefined` when it is not. Truthiness checks
(`if (args.flag)`) behave as expected; strict comparisons (`args.flag === true`) do not. Declare
`type: z.boolean()` when you need a real boolean.
:::

Unlike arguments, option values **are** coerced to the declared type, and a value that doesn't fit is
a usage error.

```ts
options: {
  port: { description: 'port to listen on', type: z.number() }
}
```

```sh
$ app --port=3000     # args.port === 3000
$ app --port=abc      # usage error: expected to be number
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
  port: { description: 'port to listen on', type: z.number(), default: 3000 }
}
```

### Repeating an option

An array-typed option accumulates every occurrence:

```ts
options: {
  tag: { description: 'a tag', type: z.array(z.string()) }
}
```

```sh
$ app --tag=a --tag=b     # args.tag === ['a', 'b']
```

A non-array option given more than once is a usage error, rather than silently keeping the last one.

## Optional values

Wrap the type in `z.optional()` to make an argument or option optional. Without it, a declared
argument is required, and omitting it is a usage error that prints the help message.

```ts
cli({ name: 'app', version: '1.0.0' }).default({
  arguments: [
    { name: 'a', description: 'an optional name', type: z.optional(z.string()) }
  ],
  options: {
    y: { description: 'an optional number', type: z.optional(z.number()) }
  },
  run(args) {
    // args.a: string | undefined
    // args.y: number | undefined
  }
})
```

## Supported types

| Declaration | `args` type | Argument | Option |
| --- | --- | --- | --- |
| *(omitted)* | `string` / `boolean \| undefined` | The default — a string | The default — a flag |
| `z.string()` | `string` | ✓ | ✓ |
| `z.number()` | `number` | typed only, value stays a string | ✓ coerced |
| `z.boolean()` | `boolean` | typed only, value stays a string | ✓ `--flag`, `--flag=true`, `--flag false` |
| `z.array(z.string())` | `string[]` | ✓ variadic | ✓ repeatable |
| `z.array(z.number())` | `number[]` | not coerced — use an option | ✓ repeatable, coerced |
| `z.optional(...)` | `T \| undefined` | ✓ makes it optional | ✓ |

Option validation happens before `run()` is called. A value that fails its schema, an unknown flag,
a missing required argument, or an extra positional argument all produce the same outcome: the CLI
prints the help message and does not run the command.

## Built-in options

Every command inherits these; you don't declare them, and you shouldn't shadow them.

| Flag | Alias | Effect |
| --- | --- | --- |
| `--help` | `-h` | Print the resolved command's help message |
| `--version` | `-v` | Print the CLI version |
| `--verbose` | `-V` | Display level `debug` |
| `--silent` | | Display level `none` |
| `--debug-cli` | | Display level `trace`, including clibuilder's own internal messages |

`args.help` is always present in the inferred type for that reason.
