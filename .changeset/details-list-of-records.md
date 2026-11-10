---
"clibuilder": minor
---

`CliError`'s `details` can hold a list of records ([#753](https://github.com/clibuilder/clibuilder/issues/753)).

A value in `details` can now be a list of records whose fields are scalars, such as `candidates: [{ id: '%1', cwd: '/repo/api' }]`. It renders as a TOON table in `toon`, a list of objects in `json`, and an aligned table in `text`. Use it in place of index-aligned lists such as `candidates`, `labels` and `cwds`. The new `CliError.DetailScalar` and `CliError.DetailRecord` types name the parts of `CliError.DetailValue`.
