# `args-minus`

A less-is-more way to parse command line input.

## Why?

There are many command line parsers out there, why `args-minus`?

In short, they are doing too much.
Too much in a sense that they impose certain assumptions to the input.

For example, some parsers assume git-style sub commands,
and others has various options to parse the whole input one way or the other.

To put in another way, they are opinionated in some shape or form.

It's not like opinionated tools are bad.
In fact, they are quite popular.
By taking away certain flexibility,
it simplifies the consumption (in code) and normalizes usage (for user).

The problem is where to define that opinion.
There are 3 obvious candidates: library, framework, or application.

Application has all the rights to be opinionated.
It is an application providing certain specific values to the end user after all.

Framework can be opinionated.
An opinionated framework is good at building certain application, but bad at others.
But that's ok. That's the price to pay to get the benefits of using a certain framework.

Library should not be opinionated.
Library should do one thing and do it well.
It should support as many scenarios as possible,
and should defer decisions to frameworks or applications.

Some command line parsing packages are frameworks, which are fine,
but other packages are designed as a library, but act more like a framework.

`args-minus` is designed to be a library.
Its sole purpose is to provide a convenient and consistent way to parse command line input,
in the way you want to parse it.

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

The package is ESM only, has no dependencies, and uses no Node API, so any
runtime that loads ES modules works. The `exports` map has one entry, `.`, with
`types`, `import` and `default` conditions pointing at the same files in `esm/`.
CI builds the package and imports it by name in Node, Deno and Bun on every
pull request. There is no CommonJS build; on Node, `require()` of an ES module
works from Node 22.12.

## Usage

```ts
import { parseArgs, parseArgsAsync, t, tokenizeArgs } from 'args-minus'
```

The package has three functions, `tokenizeArgs()`, `parseArgs()` and
`parseArgsAsync()`, the option type builders `t`, and the `ParseArgsError`
class. It depends on no runtime API, only on the JavaScript language, so it
runs wherever ES modules do.

Both take the arguments already split into an array: pass `process.argv.slice(2)`
(Node), `Deno.args`, or `Bun.argv.slice(2)`.

### Examples in this document

Every example in this section is executed by `src/readme.spec.ts`. A line
starting with `// =>` is the expected value of the expression above it, and
`// throws` is a substring of the expected error message.

## `tokenizeArgs(args, grammar?)`

Splits arguments into tokens in source order. It makes no decisions about
values: it does not know which options exist, and it never consumes the next
argument.

| Token | Fields |
| --- | --- |
| `{ kind: 'option' }` | `index`, `name` (without modifiers), `dashes` (number of leading modifier characters), `raw` (the argument as given), `value` (text after the first `=`, if any) |
| `{ kind: 'positional' }` | `index`, `value` |
| `{ kind: 'option-terminator' }` | `index` |

`index` is the position in the input array and is never reordered.

```ts
tokenizeArgs(['--name=Ada', '-v', 'file', '--', '-x'])
// => [{ kind: 'option', index: 0, name: 'name', dashes: 2, raw: '--name=Ada', value: 'Ada' }, { kind: 'option', index: 1, name: 'v', dashes: 1, raw: '-v', value: undefined }, { kind: 'positional', index: 2, value: 'file' }, { kind: 'option-terminator', index: 3 }, { kind: 'positional', index: 4, value: '-x' }]
```

Rules:

- An argument starting with one or more modifier characters (`-` by default)
  followed by a name is an option. `-` alone, and an argument made only of
  modifiers (other than the terminator), is a positional.
- `=` splits the name from an inline value at its first occurrence. An empty
  value (`--a=`) is the empty string.
- The terminator (`--` by default) is matched exactly. Every later argument is
  a positional, even if it looks like an option.

```ts
tokenizeArgs(['-', '--a='])
// => [{ kind: 'positional', index: 0, value: '-' }, { kind: 'option', index: 1, name: 'a', dashes: 2, raw: '--a=', value: '' }]
```

### Grammar

The second argument changes the syntax. Defaults: `{ modifiers: '-', terminator: '--' }`.

- `modifiers`: a string or array of single characters (not `=`) that start an
  option. Their count is reported in `dashes`.
- `terminator`: the exact argument that ends option parsing.

An invalid grammar throws an `Error`. The token order, `index` and `raw` never
depend on the grammar.

```ts
tokenizeArgs(['/v', '::', '/x'], { modifiers: '/', terminator: '::' })
// => [{ kind: 'option', index: 0, name: 'v', dashes: 1, raw: '/v', value: undefined }, { kind: 'option-terminator', index: 1 }, { kind: 'positional', index: 2, value: '/x' }]
```

## `parseArgs(config)`

Applies option declarations to the tokens.

```ts
parseArgs({ args: ['--name', 'Ada', 'file'], options: { name: { type: 'string' } } })
// => { _: ['file'], __: [], options: { name: 'Ada' } }
```

Config:

| Field | Meaning | Default |
| --- | --- | --- |
| `args` | The arguments | required |
| `options` | Declarations keyed by canonical option name | none |
| `strict` | Throw on undeclared options | `false` |
| `allowPositionals` | Accept positional arguments | `true` |
| `grammar` | Same as for `tokenizeArgs` | `-` and `--` |
| `tokens` | Also return the raw tokens | `false` |

Result:

- `_`: positional arguments before the terminator, in order.
- `__`: arguments after the terminator, in order.
- `options`: parsed values by canonical name.
- `tokens`: the `tokenizeArgs` output, only when `tokens: true`.

### Declarations

```ts
{ type: 'boolean' | 'number' | 'string', alias?, multiple?, default? }
{ type: t.int({ min: 1 }), alias?, default? }
```

`type` is a type name or a descriptor from `t` (next section).
`parseArgs` is generic over the declarations, so `options` is typed from them:
`number`, `boolean`, `string`, an array when `multiple`, and non-optional when
there is a `default`.

### Option types: `t`

A descriptor from `t` converts the raw argument to a typed value and carries
its constraints as data.

| Builder | Converts the argument to | Data |
| --- | --- | --- |
| `t.string(opts?)` | the text, matching `pattern` if given | `pattern?` |
| `t.string<T>({ pattern })` | the text, typed as `T` | `pattern` |
| `t.number(opts?)` | a finite number | `min?`, `max?` |
| `t.int(opts?)` | an integer | `min?`, `max?` |
| `t.boolean()` | `true` when present; takes no value | |
| `t.literal(value)` | exactly `value` (string, number or boolean) | `value` |
| `t.enum([...])` | one of a non-empty tuple of strings | `values` |
| `t.array(element)` | every occurrence, each converted by `element` | `element` |
| `t.custom(raw => value)` | what the function returns or resolves to | `convert` |
| `t.json(schema?)` | the value of the JSON text | `schema?` |

```ts
parseArgs({ args: ['--port', '8080', '--tag=a', '--tag=b', '--level=warn'], options: { port: { type: t.int({ min: 1, max: 65535 }) }, tag: { type: t.array(t.string()) }, level: { type: t.enum(['info', 'warn']) }, dry: { type: t.boolean().optional() } } }).options
// => { port: 8080, tag: ['a', 'b'], level: 'warn' }

parseArgs({ args: ['--port=0'], options: { port: { type: t.int({ min: 1, max: 65535 }) } } })
// throws Invalid value for option 'port': expected an integer from 1 to 65535, got '0' (from '--port=0')
```

Rules:

- A descriptor option is required unless it is `.optional()` or has a
  `default`. A required option that is absent throws.
- `t.number()` and `t.int()` are strict: an empty value, `NaN`, `Infinity` or
  trailing text is an invalid value. Both take a negative number as the next
  argument (`--n -5`).
- `t.boolean()` and a boolean `t.literal()` are flags: they never take the next
  argument, and accept only `=true` or `=false` inline.
- `t.string<T>({ pattern })` is an assertion: TypeScript cannot check `T`
  against the pattern.
- `t.literal()` and `t.enum()` infer the exact values: `t.literal(true)` is
  `true`, and `t.enum(['a', 'b'])` is `'a' | 'b'`.
- `t.array(element)` collects every occurrence in source order. The element is
  any descriptor that is neither optional nor an array. It replaces
  `multiple`, which a descriptor declaration does not take.
- `t.json()` is `unknown`, and `t.json<T>()` asserts `T` after checking only
  the JSON syntax. `t.json(schema)` validates with a
  [Standard Schema](https://standardschema.dev) and uses its output. The JSON
  comes from the argument text only; reading a file or stdin is left to the
  application.
- `t.custom(convert)` throwing a plain `Error` (whose constructor is `Error`)
  is an invalid value with that message. Any other throw propagates.
- A `default` is not converted. Its checks run on the first parse that uses its
  declaration; a failure there throws a plain `Error`, not a `ParseArgsError`.
- Definitions are checked when built: `min <= max`, integer bounds on
  `t.int()`, a non-empty `t.enum()`, and a scalar `t.literal()`. A bad one
  throws.

`.optional()` and `.check()` are the only methods, and each returns a new
descriptor. The descriptor's own fields are its data, a read-only union keyed
on `kind` (`Data`), so `{ ...t.int({ min: 1 }) }` is
`{ kind: 'int', min: 1, isOptional: false, checks: [] }`.

### Checks

`.check()` validates the converted value. It never changes the value or its
type. It takes:

- a function that returns `true` or nothing to pass, `false` to fail, or a
  string to fail with that message, or a promise of one of these;
- any Standard Schema (zod, valibot, arktype, …). Its output is ignored, and an
  async `validate` is awaited.

Checks run in declaration order and the first failure wins. A check that throws
propagates. On `t.array()`, an element's checks run on each element and the
array's checks on the whole array.

```ts
parseArgs({ args: ['--n=3'], options: { n: { type: t.int().check((n) => n % 2 === 0 || 'must be even') } } })
// throws Invalid value for option 'n': must be even (from '--n=3')

parseArgs({ args: ['--tag=a', '--tag=B'], options: { tag: { type: t.array(t.string({ pattern: /^[a-z]+$/ })) } } })
// throws Invalid value for option 'tag[1]'
```

### Asynchronous options: `parseArgsAsync(config)`

A `t.custom()` converter, a check, or a schema may be asynchronous.
`parseArgsAsync()` takes the same config as `parseArgs()`, awaits them one at a
time in input order, and resolves to the same result. `parseArgs()` stays
synchronous: when one of them returns a promise, it throws an `Error` that
names the option and asks for `parseArgsAsync()`.

### Options, dashes, and inline values

- One modifier is a short group: every character is an option. `-abc` is `a`,
  `b` and `c`.
- Two or more modifiers are one long option: `--abc` is `abc`.
- A value is the inline `=value`, or, for a declared `string` or `number`
  option, the next argument. For a short group the value belongs to the last
  character.
- An option with no value is `true`.

```ts
parseArgs({ args: ['-abc=1', '--long'] }).options
// => { a: true, b: true, c: '1', long: true }
```

### Values that follow an option

A declared `string` or `number` option takes the next argument. `boolean` and
undeclared options never do, so the next argument stays positional.

- The next argument is not taken if it looks like an option (`-x`, `--x`) or is
  the terminator. The option then fails as missing a value. Use the inline form
  for such a value: `--name=--x`.
- A `number` option does take a negative number: `--n -5`.
- Consumed arguments are not positionals. The rest keep their order.

```ts
parseArgs({ args: ['a', '--n', '-5', 'b'], options: { n: { type: 'number' } } })
// => { _: ['a', 'b'], __: [], options: { n: -5 } }

parseArgs({ args: ['--name', '--x'], options: { name: { type: 'string' } } })
// throws option 'name': a value is required
```

### Conversion

| Type | Accepts | Result |
| --- | --- | --- |
| `string` | any text | the text |
| `number` | a finite number (`1`, `-2.5`, `0x10`) | `number` |
| `boolean` | no value, `true`/`t`, `false`/`f`, or a number (`> 0` is true) | `boolean` |

Undeclared options are `true` or the raw string. Conversion also applies to
aliases and the last option of a short group.

```ts
parseArgs({ args: ['--n=1.5', '--b=0'], options: { n: { type: 'number' }, b: { type: 'boolean' } } }).options
// => { n: 1.5, b: false }

parseArgs({ args: ['--n=abc'], options: { n: { type: 'number' } } })
// throws Invalid value for option 'n': abc (from '--n=abc')
```

### Aliases and short groups

`alias` is a name or array of names without modifiers. The result always uses
the declared name. Aliases are resolved in groups too; a value-taking option
may only be last in a group, or `parseArgs` throws.

```ts
parseArgs({ args: ['-vn', 'Ada'], options: { verbose: { type: 'boolean', alias: 'v' }, name: { type: 'string', alias: 'n' } } }).options
// => { verbose: true, name: 'Ada' }

parseArgs({ args: ['-nv'], options: { verbose: { type: 'boolean', alias: 'v' }, name: { type: 'string', alias: 'n' } } })
// throws Invalid option group '-nv'
```

Two options may not share a name or alias; that throws an `Error`.

### Repeated options and defaults

- Default: last occurrence wins. `multiple: false` states it explicitly.
- `multiple: true` collects every occurrence, in source order, into an array,
  converting each.
- `default` is used only when the option is absent (also through its aliases)
  and must match the declared type (an array when `multiple`).

```ts
parseArgs({ args: ['-i', 'a', '--inc=b'], options: { inc: { type: 'string', multiple: true, alias: 'i' }, n: { type: 'number', default: 3 } } }).options
// => { inc: ['a', 'b'], n: 3 }
```

### Unknown options and positionals

By default undeclared options are accepted and kept. With `strict: true` each
undeclared name (including inside a short group) throws; aliases count as
declared. Input after the terminator is never checked. `allowPositionals: false`
throws on any positional, including those after the terminator, and is
independent of `strict`.

```ts
parseArgs({ args: ['--nope'], options: { a: { type: 'boolean' } }, strict: true })
// throws Unknown option 'nope' (from '--nope')

parseArgs({ args: ['x'], allowPositionals: false })
// throws Unexpected positional argument 'x'
```

### Errors

Invalid input throws `ParseArgsError` (an `Error`) with:

- `kind`: `unknown-option`, `unexpected-positional`, `invalid-group`,
  `missing-value`, `invalid-value` or `missing-option`,
- `option`: the option name (`undefined` for an unexpected positional),
- `input`: the argument as written, e.g. `--n=abc` (empty for a missing option),
- `index`: for an array option, the index of the element that failed,
- `issues`: the issues from a Standard Schema that failed. The message never
  repeats a schema's text.

A mistake in the declarations or grammar (duplicate alias, bad modifier) throws
a plain `Error`. `parseArgs` never returns `NaN` or `undefined` for a declared
option.

## Compatibility

`args-minus` follows semantic versioning. These are stable and change only in a
major version: the exports above, the token shapes and field names, the
descriptor data, the parsing rules in this document, and the error class and
its fields. Error message text is informative; match on `ParseArgsError` and
its fields instead.
