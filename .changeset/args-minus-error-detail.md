---
'args-minus': minor
---

`ParseArgsError` gains `value`, the raw value that failed, and `detail`, what was wrong without the option and input framing of `message`.

Fix `tokenizeArgs` dropping the text after a second `=` in an inline value: `--opt=a=b` now has the value `a=b`, as the readme documents.
