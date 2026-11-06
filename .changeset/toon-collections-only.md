---
"clibuilder": minor
---

`--format toon` now uses TOON only for collections ([AXI conventions, change 1](https://clibuilder.github.io/clibuilder/getting-started/axi/#change-1-toon-only-for-collections)).
An array, at any depth, is still encoded by the official `@toon-format/toon` encoder, as a table or an inline list.
A string field outside any array, in a single object, an error or an empty state, is now a plain `key: value` line, unquoted:

```diff
- error: "invalid value for option --port: expected an integer from 1 to 65535, received \"70000\""
+ error: invalid value for option --port: expected an integer from 1 to 65535, received "70000"
  code: invalid-value
- option: "--port"
+ option: --port
  value: "70000"
  help[2]: "Usage: my-cli deploy <arguments> [options]","expected for --port: int 1..65535 (received \"70000\")"
```

The output is still TOON: a TOON decoder reads it back to the same value as before.
A value stays quoted when a decoder would read it otherwise: the empty string, edge whitespace, a newline or other control character, a leading `"` or `#`, and a string that reads as `true`, `false`, `null`, a number or `[]`.
`json` and `text` do not change, and a `result(value, { render: { toon } })` renderer still replaces the encoder.

Migration: nothing to do if you read `toon` output with a TOON decoder, or use `--format json`.
If you match the raw text, such as a snapshot or a `grep` for `option: "--port"`, update the expected text to the unquoted form, or decode it first.
