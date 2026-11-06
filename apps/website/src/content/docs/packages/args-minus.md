---
title: args-minus
description: "The dependency-free argument parser in this repository: tokenizeArgs(), parseArgs(), and its option type descriptors, t."
---

`args-minus` is a dependency-free command line parser that runs in Node.js 20 and later, Deno 2, Bun 1
and browsers. It lives in this repository under
[`packages/args-minus`](https://github.com/clibuilder/clibuilder/tree/main/packages/args-minus).
This page is its full reference: `tokenizeArgs()`, `parseArgs()`, and the option type descriptors,
`t`, which `clibuilder` re-exports and which replace zod in `clibuilder` 12 (see
[zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t)).

The `t` descriptors and `parseArgsAsync()` are available in `args-minus` 0.2.0, and the `t`
re-export is available in `clibuilder` 11.5.0.

## Why args-minus

Many command line parsers impose assumptions on the input. Some assume git-style sub-commands.
Others offer options that parse the whole input one way or another. That makes them opinionated.

An opinion belongs in an application, which serves its own users, or in a framework, which is good at
some applications and bad at others by choice. A library should do one thing, support as many
scenarios as it can, and leave those decisions to the framework or the application. Some parsers are
published as libraries but act like frameworks.

`args-minus` is a library. It parses command line input in a convenient and consistent way, in the
way you want to parse it. `clibuilder` is a framework built on it.

## Installation

```sh
npm install args-minus
pnpm add args-minus
yarn add args-minus
deno add args-minus
bun add args-minus
```

## Supported runtimes

| Runtime | Supported |
| --- | --- |
| Node.js | 20 and later |
| Deno | 2 and later |
| Bun | 1 and later |
| Browsers and workers | current evergreen versions |

The package is ESM only, has no dependencies, and uses no Node API, so any runtime that loads ES
modules works. The `exports` map has one entry, `.`, with `types`, `import` and `default` conditions
that point at the same files in `esm/`. CI builds the package and imports it by name in Node, Deno
and Bun on every pull request.

## Usage

```ts
import { parseArgs, parseArgsAsync, t, tokenizeArgs } from 'args-minus'
```

The package has three functions, `tokenizeArgs()`, `parseArgs()` and `parseArgsAsync()`, the option
type builders `t`, and the `ParseArgsError` class.

Each function takes the arguments already split into an array: pass `process.argv.slice(2)` (Node),
`Deno.args`, or `Bun.argv.slice(2)`.

## `parseArgs(config)`

`parseArgs()` applies option declarations to the tokens.

```ts
parseArgs({ args: ['--name', 'Ada', 'file'], options: { name: { type: 'string' } } })
// => { _: ['file'], __: [], options: { name: 'Ada' } }
```

The config:

| Field | Meaning | Default |
| --- | --- | --- |
| `args` | The arguments | required |
| `options` | Declarations keyed by canonical option name | none |
| `strict` | Throw on undeclared options | `false` |
| `allowPositionals` | Accept positional arguments | `true` |
| `grammar` | The same as for `tokenizeArgs()` | `-` and `--` |
| `tokens` | Also return the raw tokens | `false` |

The result:

- `_`: the positional arguments before the terminator, in order.
- `__`: the arguments after the terminator, in order.
- `options`: the parsed values by canonical name.
- `tokens`: the `tokenizeArgs()` output, only with `tokens: true`.

`parseArgs()` never returns `NaN` or `undefined` for a declared option.

### Declarations

```ts
{ type: 'boolean' | 'number' | 'string', alias?, multiple?, default? }
{ type: t.int({ min: 1 }), alias?, default? }
```

`type` is a type name or a descriptor from [`t`](#declaring-options-with-t). `parseArgs()` is generic
over the declarations, so `options` is typed from them: `number`, `boolean` or `string`, an array
with `multiple`, and non-optional when there is a `default`.

### Options, dashes, and inline values

- One modifier starts a short group, and every character in it is an option: `-abc` is `a`, `b` and
  `c`.
- Two or more modifiers start one long option: `--abc` is `abc`.
- A value is the inline `=value` or, for a declared `string` or `number` option, the next argument.
  In a short group the value belongs to the last character.
- An option with no value is `true`.

```ts
parseArgs({ args: ['-abc=1', '--long'] }).options
// => { a: true, b: true, c: '1', long: true }
```

### Values that follow an option

A declared `string` or `number` option takes the next argument. A `boolean` option and an undeclared
option never do, so the next argument stays positional.

- The next argument is not taken if it looks like an option (`-x`, `--x`) or is the terminator. The
  option then fails as missing a value. Use the inline form for such a value: `--name=--x`.
- A `number` option does take a negative number: `--n -5`.
- Consumed arguments are not positionals. The rest keep their order.

```ts
parseArgs({ args: ['a', '--n', '-5', 'b'], options: { n: { type: 'number' } } })
// => { _: ['a', 'b'], __: [], options: { n: -5 } }

parseArgs({ args: ['--name', '--x'], options: { name: { type: 'string' } } })
// throws ParseArgsError: option 'name': a value is required
```

### Conversion

The type names convert like this:

| Type | Accepts | Result |
| --- | --- | --- |
| `string` | any text | the text |
| `number` | a finite number (`1`, `-2.5`, `0x10`) | `number` |
| `boolean` | no value, `true` or `t`, `false` or `f`, or a number (`> 0` is true) | `boolean` |

An undeclared option is `true` or the raw string. Conversion also applies to aliases and to the last
option of a short group.

```ts
parseArgs({ args: ['--n=1.5', '--b=0'], options: { n: { type: 'number' }, b: { type: 'boolean' } } }).options
// => { n: 1.5, b: false }

parseArgs({ args: ['--n=abc'], options: { n: { type: 'number' } } })
// throws ParseArgsError: Invalid value for option 'n': abc (from '--n=abc')
```

### Aliases and short groups

`alias` is a name or an array of names, without modifiers. The result always uses the declared name.
Aliases are resolved in short groups too. A value-taking option may only be last in a group, or
`parseArgs()` throws.

```ts
const options = {
  verbose: { type: 'boolean', alias: 'v' },
  name: { type: 'string', alias: 'n' }
}

parseArgs({ args: ['-vn', 'Ada'], options }).options
// => { verbose: true, name: 'Ada' }

parseArgs({ args: ['-nv'], options })
// throws ParseArgsError: Invalid option group '-nv'
```

Two options may not share a name or an alias. That throws an `Error`.

### Repeated options and defaults

- By default the last occurrence wins. `multiple: false` states it explicitly.
- `multiple: true` collects every occurrence, in source order, into an array, and converts each one.
- `default` is used only when the option is absent, also through its aliases. It must match the
  declared type, which is an array with `multiple`.

```ts
parseArgs({
  args: ['-i', 'a', '--inc=b'],
  options: {
    inc: { type: 'string', multiple: true, alias: 'i' },
    n: { type: 'number', default: 3 }
  }
}).options
// => { inc: ['a', 'b'], n: 3 }
```

### Unknown options and positionals

By default an undeclared option is accepted and kept. With `strict: true`, each undeclared name throws,
including one inside a short group. Aliases count as declared. Input after the terminator is never
checked.

`allowPositionals: false` throws on any positional, including those after the terminator. It is
independent of `strict`.

```ts
parseArgs({ args: ['--nope'], options: { a: { type: 'boolean' } }, strict: true })
// throws ParseArgsError: Unknown option 'nope' (from '--nope')

parseArgs({ args: ['x'], allowPositionals: false })
// throws ParseArgsError: Unexpected positional argument 'x'
```

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
- A check may be async. Use `parseArgsAsync()` for it (see [`parseArgs()` and `parseArgsAsync()`](#parseargs-and-parseargsasync)).
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

## Errors

Input that does not fit the declarations throws a `ParseArgsError`. Match on its fields, not on the
message text:

| Field | Meaning |
| --- | --- |
| `kind` | `unknown-option`, `unexpected-positional`, `invalid-group`, `missing-value`, `invalid-value` or `missing-option` |
| `option` | The option name as declared, or as given for an unknown option. `undefined` for an unexpected positional |
| `input` | The argument as written, such as `--n=abc`. Empty for a missing option |
| `index` | For an array option, the index of the element that failed |
| `issues` | The issues from a Standard Schema that failed. The message never repeats a schema's text |
| `value` | The raw value that failed, as typed. `undefined` when none was given |
| `detail` | What was wrong, without the option and input framing of `message`: what the descriptor expected (`expected an integer from 1 to 65535`), a check's own message, or a converter's error message |

A framework that reports errors in its own words reads `detail` instead of parsing `message`.

A mistake in the declarations or the grammar, such as a duplicate alias or a bad modifier, throws a
plain `Error`. So does a failing check on a `default`, which runs on the first parse that uses its
declaration.

## Reading a descriptor

A descriptor's own fields are its data: a frozen, read-only object keyed on `kind`. Help screens and
other tools read it instead of the descriptor's internals.

```ts
({ ...t.int({ min: 1 }) })
// => { kind: 'int', min: 1, isOptional: false, checks: [] }
```

`.optional()` and `.check()` are a descriptor's only methods, and each returns a new descriptor.
The `Data` type is the union of the data forms.

`isDescriptor(value)` tells whether a value was built by `t`. It accepts a descriptor from any copy
of `args-minus` loaded in the same process, such as a copy bundled into a CLI and another installed
for its plugins, as long as both use the same descriptor format. A copy of the data
(`{ ...descriptor }`) is not a descriptor.

## `tokenizeArgs(args, grammar?)`

`tokenizeArgs()` splits arguments into tokens in source order. It makes no decisions about values: it
does not know which options exist, and it never consumes the next argument.

| Token | Fields |
| --- | --- |
| `{ kind: 'option' }` | `index`, `name` (without modifiers), `dashes` (number of leading modifier characters), `raw` (the argument as given), `value` (text after the first `=`, if any) |
| `{ kind: 'positional' }` | `index`, `value` |
| `{ kind: 'option-terminator' }` | `index` |

`index` is the position in the input array and is never reordered.

```ts
tokenizeArgs(['--name=Ada', '-v', 'file', '--', '-x'])
// => [
//   { kind: 'option', index: 0, name: 'name', dashes: 2, raw: '--name=Ada', value: 'Ada' },
//   { kind: 'option', index: 1, name: 'v', dashes: 1, raw: '-v', value: undefined },
//   { kind: 'positional', index: 2, value: 'file' },
//   { kind: 'option-terminator', index: 3 },
//   { kind: 'positional', index: 4, value: '-x' }
// ]
```

The rules:

- An argument that starts with one or more modifier characters (`-` by default), followed by a name,
  is an option. `-` alone is a positional, and so is an argument made only of modifiers, other than
  the terminator.
- `=` splits the name from an inline value at its first occurrence. An empty value (`--a=`) is the
  empty string.
- The terminator (`--` by default) is matched exactly. Every later argument is a positional, even if
  it looks like an option.

```ts
tokenizeArgs(['-', '--a='])
// => [
//   { kind: 'positional', index: 0, value: '-' },
//   { kind: 'option', index: 1, name: 'a', dashes: 2, raw: '--a=', value: '' }
// ]
```

### Grammar

The second argument changes the syntax. The defaults are `{ modifiers: '-', terminator: '--' }`.

- `modifiers` is a string or an array of single characters, other than `=`, that start an option.
  Their count is reported in `dashes`.
- `terminator` is the exact argument that ends option parsing.

An invalid grammar throws an `Error`. The token order, `index` and `raw` never depend on the grammar.

```ts
tokenizeArgs(['/v', '::', '/x'], { modifiers: '/', terminator: '::' })
// => [
//   { kind: 'option', index: 0, name: 'v', dashes: 1, raw: '/v', value: undefined },
//   { kind: 'option-terminator', index: 1 },
//   { kind: 'positional', index: 2, value: '/x' }
// ]
```

## Compatibility

`args-minus` follows semantic versioning. These are stable and change only in a major version: the
exports on this page, the token shapes and field names, the descriptor data, the parsing rules on
this page, and the error class and its fields. The error message text is informative only: match on
`ParseArgsError` and its fields instead.

## Using `t` in clibuilder

`clibuilder` re-exports `t`. See [`t`](/clibuilder/api/t/) for how a command declares its arguments
and options with it.
