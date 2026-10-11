---
title: z
description: The zod instance clibuilder validates with, re-exported so your schemas match the library's.
---

```ts
import { z } from 'clibuilder'
```

`clibuilder` re-exports [zod](https://github.com/colinhacks/zod) as `z`. Import it from `clibuilder`
rather than adding zod as your own dependency — that guarantees the schemas you build are instances
of the same zod the library validates with, which is the usual cause of "this schema isn't being
recognized" bugs.

:::note[`t` beside `z`]
`clibuilder` 11.5.0 also accepts the
[`t` option descriptors](/clibuilder/packages/args-minus/#using-t-in-clibuilder) in an argument's or
option's `type`. `z` keeps working unchanged, and a command can mix both. `clibuilder` 12 is planned
to remove zod and the `z` re-export. See the [v12 roadmap](/clibuilder/roadmap/v12/#zod-is-replaced-by-t).
:::

:::note[Unreleased: `z` is deprecated]
In the next `clibuilder` 11 minor, on `main` and not yet published, the `z` re-export is marked
`@deprecated`, so your editor strikes it through and points you at `t`. It behaves exactly as before.
For `config`, pass any [Standard Schema](https://standardschema.dev) instead, such as zod 4 or valibot
installed as your own dependency. See [Configuration](/clibuilder/guides/configuration/#declaring-what-a-command-needs).
:::

## Where schemas are used

| Position | What the schema does |
| --- | --- |
| An [argument's](/clibuilder/api/command/#arguments) `type` | Coerces and validates the value, marks it optional (`z.optional`) or variadic (`z.array`), and types `args.<name>` |
| An [option's](/clibuilder/api/command/#options) `type` | Coerces and validates the value, and types `args.<name>` |
| A [command's](/clibuilder/guides/configuration/) `config` | Validates the loaded config file, and types `this.config` |

## Types the parser understands

For arguments and options, the parser converts raw argv strings using these:

- `z.string()`
- `z.number()`
- `z.boolean()`
- `z.array(z.string())`, `z.array(z.number())`, `z.array(z.boolean())`
- `z.optional(...)` around any of the above

Richer zod types — refinements, unions, transforms — get no string conversion. The raw argv string is
handed to the schema as-is, so ones that accept a string (`z.enum`, `z.literal('on')`) validate
correctly, while ones expecting a converted value do not. Do that validation inside `run()` instead.

Config schemas have no such restriction: the config file is already structured data, so any zod
schema works.

:::note[Unreleased: defaults and transforms in `config`]
Up to `clibuilder` 11.5.0 the command gets the config as it was loaded, not the schema's output, so
the `.default(3000)` below has no effect and `this.config.port` is `undefined` when the file leaves it
out. The next `clibuilder` 11 minor fixes this: `this.config` is the schema's output, with defaults
filled in, transforms applied and undeclared keys stripped by `z.object()`.
:::

```ts
config: z.object({
  presets: z.string(),
  port: z.number().default(3000),
  mode: z.union([z.literal('fast'), z.literal('thorough')])
})
```

## Inference

`z.infer<>` is what makes the types flow. An option declared as `type: z.number()` produces
`args.port: number`; a config declared as `z.object({ presets: z.string() })` produces
`this.config: { presets: string }`. You never write those types out.
