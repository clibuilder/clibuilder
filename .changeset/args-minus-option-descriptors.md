---
'args-minus': minor
---

Add option type descriptors, `t`: `t.string`, `t.number`, `t.int`, `t.boolean`, `t.literal`, `t.enum`, `t.array`, `t.custom` and `t.json`, with `.optional()` and `.check()`.
A descriptor converts the raw argument, carries its constraints as read-only data keyed on `kind`, and infers the exact option type through `parseArgs`.
`.check()` takes a function or any Standard Schema, whose output is ignored.

Add `parseArgsAsync()` for asynchronous converters, checks and schemas. `parseArgs()` stays synchronous.

`ParseArgsError` gains `kind`, `index` and `issues`.
