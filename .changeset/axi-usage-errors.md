---
'clibuilder': minor
---

Report usage errors under `cli({ output: 'axi' })` as one ranked, coded error on stdout, in the resolved format, with exit code 2, nothing on stderr and no help. In the default `output: 'console'` nothing changes.

- Only the top-ranked error is reported: unknown option, conflicting options, invalid value, expect single, missing argument, extra arguments.
- The report is `error`, `code` (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument`, `extra-arguments`), the offending `option` or `argument` and the `value` as typed, then `help`: the command's usage line and, where it fixes the mistake, the valid options, arguments or commands. An `invalid-value` error adds the allowed values of a `t.enum` or `--format`, or the constraint of a `t` declaration such as `int 1..65535`, with the value as typed.
- A command group invoked bare is code `missing-command`, listing its sub-commands, exit 2.
- A config failing the command's schema is code `invalid-config`, with the messages for each failing key, exit 1.
- `cli({ onUsageError })` and a command's own `onUsageError` still take over.
