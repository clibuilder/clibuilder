---
spec-type: behavioral
---

# Option parsing

## What

`parseArgs` applies the declared option semantics to the tokens. A declaration
names its type either by a type name (`'string'`, `'number'`, `'boolean'`) or
by a descriptor from `t`. A descriptor converts the raw argument to a typed
value, carries its constraints as readable data, and may carry checks that
validate the converted value without changing it.

Converting and validating are separate roles. The descriptor converts; a check
only passes or fails. A foreign schema (any Standard Schema) is accepted as a
check, or as the validator of `t.json(schema)`, and never as an option's shape.

**Non-goals.** Help text, command routing, reading files or stdin, and
conversions that depend on other options belong to the application or
framework.

## Use Cases

- `parseArgs(config)`: apply declared option semantics to tokens and return
  option values plus positional input. Synchronous; throws when a converter or
  check returns a promise.
- `parseArgsAsync(config)`: the same, awaiting asynchronous converters, checks
  and schemas one at a time, in input order.
- `t.<kind>(…)`: build a descriptor (`string`, `number`, `int`, `boolean`,
  `literal`, `enum`, `array`, `custom`, `json`). Definition mistakes
  (`min > max`, non-integer `t.int` bounds, an empty `t.enum`, a non-scalar
  `t.literal`, an optional or array `t.array` element) throw when built.
- Reading a descriptor's data: its own enumerable fields are a read-only union
  keyed on `kind`, with `isOptional` and `checks`.

## Failure classification

| Source | Outcome |
| --- | --- |
| a value that fails conversion, a constraint, a check (`false` or a message), or a schema's issues | `ParseArgsError`, kind `invalid-value` |
| a `t.custom` converter that throws or rejects with a plain `Error` (constructor exactly `Error`) | `ParseArgsError`, kind `invalid-value`, with that message |
| any other throw or rejection from a converter, check or schema | propagates unchanged |
| a required descriptor option that is absent | `ParseArgsError`, kind `missing-option` |
| a check that fails on a `default` | a plain `Error` (a programmer error), at the first parse that uses the declaration |
| a converter or check that returns a promise under `parseArgs` | a plain `Error` naming the option and `parseArgsAsync` |

A schema's own text is never forwarded in the message; its issues are kept on
the error's `issues`.

The scenarios are in [option-parsing.feature](option-parsing.feature).
