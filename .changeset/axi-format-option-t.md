---
'@clibuilder/axi': minor
---

`formatOption` and `defineFormatOption()` declare their `type` with `t.enum(formats).optional()` instead of a zod enum, since clibuilder 12 removes zod. Both stay deprecated and keep working: the option accepts the same values, with the same default and description. Migration: code that called `formatOption.type.parse()` or `.safeParse()` reads the descriptor's `values` instead, or better, deletes the local option and reads `this.format`.
