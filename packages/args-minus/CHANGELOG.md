# args-minus

## 0.2.0

### Minor Changes

- 8cf4fc8: `ParseArgsError` gains `value`, the raw value that failed, and `detail`, what was wrong without the option and input framing of `message`.
  
  Fix `tokenizeArgs` dropping the text after a second `=` in an inline value: `--opt=a=b` now has the value `a=b`, as the readme documents.
- bcc756d: Add option type descriptors, `t`: `t.string`, `t.number`, `t.int`, `t.boolean`, `t.literal`, `t.enum`, `t.array`, `t.custom` and `t.json`, with `.optional()` and `.check()`.
  A descriptor converts the raw argument, carries its constraints as read-only data keyed on `kind`, and infers the exact option type through `parseArgs`.
  `.check()` takes a function or any Standard Schema, whose output is ignored.
  
  Add `parseArgsAsync()` for asynchronous converters, checks and schemas. `parseArgs()` stays synchronous.
  
  `ParseArgsError` gains `kind`, `index` and `issues`.

## 0.1.0

### Minor Changes

- 46d8d97: First public release of `args-minus`: a runtime-neutral (Node 20+, Deno, Bun, browsers), dependency-free command-line tokenizer and `parseArgs` with typed option declarations, aliases, repeated options, defaults, strict mode and configurable grammar.
