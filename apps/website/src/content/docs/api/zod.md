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

## Where schemas are used

| Position | What the schema does |
| --- | --- |
| An [argument's](/clibuilder/api/command/#arguments) `type` | Marks it optional (`z.optional`) or variadic (`z.array`), and types `args.<name>` |
| An [option's](/clibuilder/api/command/#options) `type` | Coerces and validates the value, and types `args.<name>` |
| A [command's](/clibuilder/guides/configuration/) `config` | Validates the loaded config file, and types `this.config` |

## Types the parser understands

For arguments and options, the parser converts raw argv strings using these:

- `z.string()`
- `z.number()`
- `z.boolean()`
- `z.array(z.string())`, `z.array(z.number())`, `z.array(z.boolean())`
- `z.optional(...)` around any of the above

Richer zod types — refinements, unions, transforms — are not converted from strings and will not
behave as you expect on an argument or option. Do that validation inside `run()` instead.

Config schemas have no such restriction: the config file is already structured data, so any zod
schema works.

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
