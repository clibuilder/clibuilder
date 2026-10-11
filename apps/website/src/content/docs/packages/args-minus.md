---
title: args-minus
description: "The dependency-free argument parser in this repository, and its option type descriptors, t."
---

`args-minus` is a dependency-free command line parser that runs in Node.js 20 and later, Deno 2, Bun 1
and browsers. It lives in this repository under
[`packages/args-minus`](https://github.com/clibuilder/clibuilder/tree/main/packages/args-minus).
This page covers the option type descriptors, `t`, which are what `clibuilder` 12 will use in place of
zod (see the [v12 roadmap](/clibuilder/roadmap/v12/)). The package
[readme](https://github.com/clibuilder/clibuilder/tree/main/packages/args-minus#readme) is the full
reference for `tokenizeArgs()`, grammars, aliases and short groups.

:::caution[Unreleased]
The `t` descriptors and `parseArgsAsync()` are on `main` for `args-minus` 0.2.0, which is not
published yet. npm has only the `0.0.0` placeholder of `args-minus`. `clibuilder` 11 does not use
`args-minus` and does not export `t`: options in a `clibuilder` CLI are still declared with
[`z`](/clibuilder/api/zod/).
:::

## Declaring options with `t`

A descriptor converts the raw argument string to a typed value and carries its constraints as data.
Put it in the `type` of an option declaration. `parseArgs()` infers the type of each option from it.

```ts
import { parseArgs, t } from 'args-minus'

const { options } = parseArgs({
  args: ['--port', '8080', '--tag=a', '--tag=b', '--level=warn'],
  options: {
    port: { type: t.int({ min: 1, max: 65535 }) },
    tag: { type: t.array(t.string()) },
    level: { type: t.enum(['info', 'warn']) },
    dry: { type: t.boolean().optional() }
  }
})
// options: { port: number; tag: string[]; level: 'info' | 'warn'; dry?: boolean }
// => { port: 8080, tag: ['a', 'b'], level: 'warn' }
```

A descriptor option is required. An absent option throws a `missing-option` error unless it is
`.optional()` or has a `default`. That includes `t.boolean()`: write `t.boolean().optional()` for a
flag that may be left out.

## Builders

Each builder takes its constraints in one options bag. There is no `.min().max()` chain.

| Builder | Example | Inferred type |
| --- | --- | --- |
| `t.string(opts?)` | `t.string({ pattern: /^v\d+$/ })` | `string` |
| `t.string<T>({ pattern })` | `` t.string<`v${number}`>({ pattern: /^v\d+$/ }) `` | `` `v${number}` `` |
| `t.number(opts?)` | `t.number({ min: 0, max: 1 })` | `number` |
| `t.int(opts?)` | `t.int({ min: 1, max: 65535 })` | `number` |
| `t.boolean()` | `t.boolean()` | `boolean` |
| `t.literal(value)` | `t.literal('fast')` | `'fast'` |
| `t.enum(values)` | `t.enum(['info', 'warn'])` | `'info' \| 'warn'` |
| `t.array(element)` | `t.array(t.string())` | `string[]` |
| `t.custom(convert)` | `t.custom((raw) => new Date(raw))` | `Date` |
| `t.json(schema?)` | `t.json()` | `unknown` |

The constraints:

- `t.string()` takes `pattern`, a `RegExp`. `t.string<T>({ pattern })` types the value as `T`.
  That is your assertion: TypeScript cannot check a type against a regular expression.
- `t.number()` and `t.int()` take `min` and `max`. Both are strict: an empty value, `NaN`,
  `Infinity` or trailing text is an invalid value. Both accept a negative number as the next
  argument (`--n -5`).
- `t.boolean()` is `true` when the flag is present. It never takes the next argument, and accepts
  only `=true` or `=false` inline.
- `t.literal()` takes a string, a finite number or a boolean, and infers the exact value:
  `t.literal(true)` is `true`, not `boolean`.
- `t.enum()` takes a non-empty tuple of strings.
- A bad definition throws when it is built: `min` greater than `max`, a fractional bound on
  `t.int()`, an empty `t.enum()`, or a `t.literal()` that is not a scalar.

`default`, `alias` and `description` stay on the option declaration, beside the descriptor. A
`default` is not converted, and it makes the option present in the result type:

```ts
parseArgs({ args: [], options: { port: { type: t.int(), default: 8080 } } }).options
// options: { port: number }
// => { port: 8080 }
```

### Arrays

`t.array(element)` collects every occurrence of the option, in order, and converts each one with
`element`. The element is any descriptor that is neither optional nor an array, so `t.custom()` and
`t.json()` work as elements. An error on one element names its index:

```ts
parseArgs({ args: ['--tag=a', '--tag=B'], options: { tag: { type: t.array(t.string({ pattern: /^[a-z]+$/ })) } } })
// throws ParseArgsError: Invalid value for option 'tag[1]' ... (error.index is 1)
```

`t.array()` replaces the `multiple: true` flag of the `'string'`, `'number'` and `'boolean'` type
names. A descriptor declaration does not take `multiple`.

### `.optional()`

`.optional()` lets the option be absent. The option's key becomes optional in the result type.

```ts
parseArgs({ args: [], options: { ratio: { type: t.number({ min: 0, max: 1 }).optional() } } }).options
// options: { ratio?: number }
// => {}
```

## Validating with `.check()`

`.check()` validates the converted value. It never changes the value or its type. It takes a
function or any [Standard Schema](https://standardschema.dev) (zod, valibot, arktype and others).

A check function passes by returning `true` or nothing. It fails by returning `false`, which gives a
generic message, or a string, which becomes the message.

```ts
parseArgs({ args: ['--n=3'], options: { n: { type: t.int().check((n) => n % 2 === 0 || 'must be even') } } })
// throws ParseArgsError: Invalid value for option 'n': must be even (from '--n=3')
```

A schema runs for pass or fail only. Its output is ignored, so a `transform`, `trim`, `default` or
coercion inside it has no effect. Its issues are on the error's `issues`, and the message never
repeats the schema's text.

```ts
import { z } from 'zod'

parseArgs({ args: ['--email=ada'], options: { email: { type: t.string().check(z.email()) } } })
// throws ParseArgsError: Invalid value for option 'email': failed a check (from '--email=ada')
```

The rules:

- A returned `false`, a returned string, or a schema issue is an `invalid-value` usage error.
- A check that throws, or whose promise rejects, is not a usage error. The error propagates as it is.
- A check may be async. Use `parseArgsAsync()` for it (see below).
- Checks run in declaration order, and the first failure wins.
- On `t.array()`, a check on the element runs on each element, and a check on the array runs on the
  whole array.

## Converting with `t.custom()`

`t.custom(convert)` converts the raw string with your function, for what the built-in kinds do not
cover: a date, a URL, `1k` to `1000`, a duration. The type the function returns, or its promise
resolves to, is the option's type.

```ts
const duration = t.custom((raw) => {
  const match = /^(\d+)s$/.exec(raw)
  if (!match) throw new Error(`'${raw}' is not a duration such as 30s`)
  return Number(match[1]) * 1000
})

parseArgs({ args: ['--timeout=x'], options: { timeout: { type: duration } } })
// throws ParseArgsError: Invalid value for option 'timeout': 'x' is not a duration such as 30s (from '--timeout=x')
```

How a failure is reported depends on what the function throws:

- A plain `Error` (its constructor is `Error` itself) is an `invalid-value` usage error, with the
  error's message.
- Anything else propagates unchanged: a `TypeError` from a bug, a library's own error class, or a
  value that is not an `Error`.

The converter may be async. It then needs `parseArgsAsync()`.

## Parsing JSON with `t.json()`

`t.json()` parses the argument as JSON:

| Form | Inferred type | What is checked |
| --- | --- | --- |
| `t.json()` | `unknown` | JSON syntax |
| `t.json<Config>()` | `Config` | JSON syntax only; the type is your assertion |
| `t.json(schema)` | the schema's output type | JSON syntax, then the schema |

Text that is not JSON is an `invalid-value` error that says it is not valid JSON. Unlike
`.check()`, `t.json(schema)` uses the schema's output as the value. The JSON comes from the argument
text only. Read a file or stdin in your own code.

## What belongs in the parser and what belongs in `run()`

Put a conversion or a check in the descriptor when all three hold:

1. It is a function of the one raw string. It does not read other options, the filesystem or the
   network.
2. Its failure is a usage error that the caller can fix by changing the argument.
3. Its result belongs in the typed options.

Anything else belongs in your command's own code. In a `clibuilder` command that is `run()`, which
reports a failure by throwing a [`CliError`](/clibuilder/guides/failing/#failing-from-a-command).
That covers reading a file, resolving a path against the working directory, calling the network,
and anything that depends on another option. An async converter or check is allowed, but I/O in one
delays every parse that sets the option, and its failure is rarely one the caller can fix.

## `parseArgs()` and `parseArgsAsync()`

`parseArgs()` is synchronous. `parseArgsAsync()` takes the same config and resolves to the same
result, and it awaits converters, checks and schemas one at a time, in input order.

Use `parseArgsAsync()` when any `t.custom()` converter, check function or schema returns a promise.
If one does under `parseArgs()`, it throws an `Error` that names the option and asks for
`parseArgsAsync()`.

```ts
import { parseArgsAsync, t } from 'args-minus'

await parseArgsAsync({
  args: ['--n=3'],
  options: { n: { type: t.int().check(async (n) => n > 5 || 'too small') } }
})
// rejects with ParseArgsError: Invalid value for option 'n': too small (from '--n=3')
```

## Errors

Input that does not fit the declarations throws a `ParseArgsError`. Match on its fields, not on the
message text:

| Field | Meaning |
| --- | --- |
| `kind` | `unknown-option`, `unexpected-positional`, `invalid-group`, `missing-value`, `invalid-value` or `missing-option` |
| `option` | The option name as declared, or as given for an unknown option. `undefined` for an unexpected positional |
| `input` | The argument as written, such as `--n=abc`. Empty for a missing option |
| `index` | For an array option, the index of the element that failed |
| `issues` | The issues from a Standard Schema that failed |

A mistake in the declarations, such as a duplicate alias, throws a plain `Error`. So does a failing
check on a `default`, which runs on the first parse that uses its declaration.

## Reading a descriptor

A descriptor's own fields are its data: a frozen, read-only object keyed on `kind`. Help screens and
other tools read it instead of the descriptor's internals.

```ts
({ ...t.int({ min: 1 }) })
// => { kind: 'int', min: 1, isOptional: false, checks: [] }
```

The `Data` type is the union of these forms, and `isDescriptor(value)` tells whether a value was
built by `t`.
