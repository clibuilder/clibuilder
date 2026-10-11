---
'clibuilder': minor
---

A command's `config` takes any Standard Schema, such as zod 3.24 or later, zod 4, valibot or arktype. It is validated with `~standard.validate`, which is awaited when it returns a promise, and `this.config` is typed from the schema's output. A failure is reported with each issue's message under the dotted path of the value that failed, or under `(config)` when the issue has no path, and the cli exits with code 1. Help shows the config under `Config:` from the JSON Schema of its input when the schema implements `~standard.jsonSchema`, and leaves the section out otherwise.

`this.config` is the config schema's output, not the loaded input. In 11.5.0 a `.default()` or `.transform()` in a config schema had no effect. Now defaults are filled in and transforms applied, and `z.object()` strips keys it does not declare.

With no config file, a schema that rejects `undefined` is validated against `{}`, so a command whose config keys all have defaults runs with them, in a CLI and in `testCommand()` without a config. A missing required key is reported by name. In 11.5.0 both failed with `expected object, received undefined`.

`no config found` and the file names searched for are a `debug` message, shown under `--verbose` and `--debug-cli`, not a warning on every run.
