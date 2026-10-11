---
'clibuilder': minor
---

A command's `config` takes any Standard Schema, such as zod 4, valibot or arktype, beside the zod 3 schemas from `z`.
It is validated with `~standard.validate`, which is awaited when it returns a promise, and `this.config` is typed from the schema's output.
A failure is reported like a zod config's: each issue's message under the dotted path of the value that failed, or under `(config)` when the issue has no path, then help, and the cli exits with the error code.
Help shows a Standard Schema config under `Config:` from the JSON Schema of its input when the schema implements `~standard.jsonSchema`, and leaves the section out otherwise. A zod 3 config renders as before.

Fix: `this.config` is the config schema's output, not the loaded input. Before, a `.default()` or `.transform()` in a zod config schema had no effect. Now defaults are filled in and transforms applied, and `z.object()` strips keys it does not declare.

The `z` re-export is `@deprecated` in favour of `t` for options and arguments, and any Standard Schema for `config`.
The `testCommand` export from the root entry is `@deprecated` in favour of the one from `clibuilder/testing`. Both behave as before.
