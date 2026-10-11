---
title: t
description: The option and argument type descriptors that clibuilder re-exports from args-minus.
---

```ts
import { t } from 'clibuilder'
```

`t` declares the `type` of an argument or option. `run(args)` gets the descriptor's exact type, and
the value is converted and checked before `run()` is called. `t` is re-exported from
[`args-minus`](/clibuilder/packages/args-minus/), which is the reference for every builder, for
`.check()` and for the errors.

:::note[v12, unreleased]
In `clibuilder` 11.5.0 `t` works beside zod's `z`. In `clibuilder` 12 `z` is gone and `t` is the only
way to declare a `type`. See [zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t).
:::

```ts
import { command, t } from 'clibuilder'

command({
  name: 'serve',
  arguments: [{ name: 'root', description: 'root folder', type: t.string() }],
  options: {
    port: { description: 'port', type: t.int({ min: 1, max: 65535 }), default: 8080, alias: ['p'] },
    tag: { description: 'tags', type: t.array(t.string()).optional() }
  },
  run(args) {
    // args.root: string, args.port: number, args.tag: string[] | undefined
  }
})
```

## Builders

| Builder | Inferred type |
| --- | --- |
| `t.string({ pattern })` | `string` |
| `t.number({ min, max })` | `number` |
| `t.int({ min, max })` | `number` |
| `t.boolean()` | `boolean` |
| `t.literal(value)` | the exact value |
| `t.enum([...])` | a union of the values |
| `t.array(element)` | an array of the element type |
| `t.custom(convert)` | what `convert` returns. It may be async |
| `t.json(schema?)` | `unknown`, or the schema's output |

There are two chained methods. `.optional()` lets the value be absent. `.check(fn)` takes a function
or any [Standard Schema](https://standardschema.dev), such as `t.string().check(z.email())` with
`z` from your own `zod`. There is no `.min()` chain: constraints go in the builder's options.
`default`, `alias` and `description` stay on the option entry.

## Rules in clibuilder

- An option or argument without `type` keeps its default. An option is an optional flag, and an
  argument is a string.
- An option declared without `.optional()` and without a `default` is required. A missing one is a
  usage error.
- A boolean option takes no value after it. Write `--flag=false`, not `--flag false`.
- An array option takes one value per occurrence: `--tag a --tag b`, not `--tag a b`.
- An array argument is variadic. It consumes the remaining positional arguments.
- A failed conversion or check is an `invalid-value` usage error. The CLI prints the help message and
  does not run the command.
- Async converters and checks are awaited by clibuilder.

## Help hints

Help shows the constraint beside the name:

```text
[--port <int 1..65535>]
[--tag <string>...]
[--dry]
<root: string>
[ids: int >=1...]
```

## Config schemas

A command's `config` is not a `t` descriptor. It takes any Standard Schema from your own
dependencies. See [Configuration](/clibuilder/guides/configuration/).
