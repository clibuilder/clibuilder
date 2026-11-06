# `args-minus`

A less-is-more way to parse command line input.

`args-minus` is a library, not a framework: it parses the input the way you want to parse it, and
leaves sub-commands and other opinions to the application.

📖 **[Read the documentation](https://clibuilder.github.io/clibuilder/packages/args-minus/)**

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

The package is ESM only, has no dependencies, and uses no Node API.

## Usage

```ts
import { parseArgs, parseArgsAsync, t, tokenizeArgs } from 'args-minus'
```

Pass the arguments already split into an array: `process.argv.slice(2)` (Node), `Deno.args`, or
`Bun.argv.slice(2)`.

```ts
parseArgs({ args: ['--name', 'Ada', 'file'], options: { name: { type: 'string' } } })
// => { _: ['file'], __: [], options: { name: 'Ada' } }

parseArgs({ args: ['--port', '8080', '--tag=a', '--tag=b', '--level=warn'], options: { port: { type: t.int({ min: 1, max: 65535 }) }, tag: { type: t.array(t.string()) }, level: { type: t.enum(['info', 'warn']) }, dry: { type: t.boolean().optional() } } }).options
// => { port: 8080, tag: ['a', 'b'], level: 'warn' }

parseArgs({ args: ['--port=0'], options: { port: { type: t.int({ min: 1, max: 65535 }) } } })
// throws Invalid value for option 'port': expected an integer from 1 to 65535, got '0' (from '--port=0')
```

`src/readme.spec.ts` runs these examples.

## Option types: `t`

A descriptor from `t` converts the raw argument to a typed value, and `parseArgs()` infers the type
of each option from it.

| Builder | Converts the argument to |
| --- | --- |
| `t.string(opts?)` | the text, matching `pattern` if given |
| `t.number(opts?)`, `t.int(opts?)` | a finite number or an integer, within `min` and `max` |
| `t.boolean()` | `true` when present; takes no value |
| `t.literal(value)`, `t.enum([...])` | exactly that value, or one of the values |
| `t.array(element)` | every occurrence, each converted by `element` |
| `t.custom(raw => value)` | what the function returns or resolves to |
| `t.json(schema?)` | the value of the JSON text |

`.optional()` lets an option be absent, and `.check()` validates the value with a function or any
[Standard Schema](https://standardschema.dev).

## Documentation

The [documentation](https://clibuilder.github.io/clibuilder/packages/args-minus/) is the full reference: `tokenizeArgs()` and its grammar, the parsing
rules, checks, `parseArgsAsync()`, errors, and compatibility.
