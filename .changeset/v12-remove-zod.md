---
'clibuilder': major
---

Remove zod. `t` is the only way to declare an argument or option `type`, and `config` takes any Standard Schema, or none.

- **`z` is removed**, with `isZodArray`, `isZodBoolean`, `isZodEnum`, `isZodNumber`, `isZodObject`, `isZodOptional` and `isZodString`. Migration: `import { t } from 'clibuilder'` and declare types with `t`: `z.optional(z.number())` becomes `t.number().optional()`. `npx @clibuilder/codemod src` rewrites the supported calls (add `--dry-run` to preview the diff).
- **A zod 3 `config` from `z` is gone.** Migration: import your schema library yourself (`import { z } from 'zod'`); zod 3.24 or later, zod 4, valibot and arktype all work. Help builds the `Config:` section from the schema's JSON Schema only, so a zod 3 config, which has none, no longer shows one.
- **A boolean option takes no value after it.** `--dry false` leaves `false` as a positional, for an option declared without a `type` too and for `--verbose`, `--help` and the other global flags. Migration: write `--dry=false`.
- **An array option takes one value per occurrence.** Migration: write `--tag a --tag b` instead of `--tag a b`.
- **An option that is neither `.optional()` nor given a `default` must be passed.** zod typed it as present but did not enforce it. Migration: add `.optional()` where the option may be left out.
- **A single-valued option given twice gets no value**, beside its `expect-single` usage error. zod also used the last value.
- **`z.coerce`, `.transform()` and `.default()` in an option type have no equivalent.** Migration: convert with `t.custom(raw => value)`, put the default in the option's `default`, and validate with `.check()`.
- **`cli.UsageError`'s `keyType` is removed.** Migration: read `keyKind`, the kind string. Usage error messages use the `args-minus` wording, such as `expected a number`.
- **Help hints use the `t` form**: `[--name <string>]` and `<file: string>` instead of `[--name=string]` and `<file=string>`, and a string default is quoted, including the global `--format`'s.
- **`js-yaml` is an optional peer dependency**, loaded only when a `.yaml` or `.yml` config file is read. Without it, reading one fails with a `CliError` whose code is `missing-peer-dependency`. Migration: a CLI whose users write YAML config runs `npm install js-yaml`.

`zod`, `type-plus`, `tersify` and `js-yaml` leave `dependencies`. With standard-log also gone, a clean install of `clibuilder` drops from 41 packages (19 MB) in 11.5.0 to 3 (1.2 MB), and the packed tarball from 396 KB to 108.9 kB.
