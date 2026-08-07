---
'clibuilder': minor
---

Coerce argument and untyped-option values to match their declared types.

Both fixes close a gap where the type system and the runtime disagreed about what `run(args)`
receives.

- Positional arguments are now coerced through the same conversion path options already use.
  `type: z.number()` yields a `number`, `type: z.array(z.number())` yields `number[]`, and a value
  that fails its schema is a usage error instead of being silently dropped. An array argument is
  variadic: it consumes the remaining positionals. Previously every argument arrived as a raw string,
  and `z.array(z.number())` ended up `undefined`.
- An option declared without a `type` now defaults to `z.optional(z.boolean())` instead of
  `z.optional(z.string())`, so a flag yields a real `true` rather than the string `'true'`.
  `RunArgs` has always inferred this case as `boolean | undefined`.

Note two behavior changes for code that relied on the old runtime values:

- `--flag=somevalue` on an option with no declared `type` is now a usage error. Declare
  `type: z.string()` to keep accepting a string value.
- An argument declared with a type that has no string conversion (`z.enum`, `z.literal`) now has the
  raw argv string handed to its schema, which accepts or rejects it. It is no longer passed through
  unvalidated.
