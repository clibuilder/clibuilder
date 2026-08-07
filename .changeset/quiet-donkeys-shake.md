---
'clibuilder': minor
---

Config subsystem: jsonc support, a public lookup/load API, and `--show-config`.

**JSONC config (#341)**

`.jsonc` and `.jsonc`-suffixed rc files are now searched for, and `.json` files may contain comments
and trailing commas. Parsing goes through `jsonc-parser`, so comment-like sequences inside strings
are left alone — `"http://example.com"` is no longer at risk of being truncated at the `//`.

The format is now chosen by extension rather than by trying every parser in turn. Extension-less
candidates such as `.apprc` still infer their format from content (JSONC, then YAML, then module).
One consequence: a `.json` file that is not valid JSON now reports a parse error naming the file,
where before it was silently retried as YAML and could load as something unintended.

**Config lookup/load API (#488)**

`clibuilder` now exports its config resolution, so plugins and tools can ask where a config came
from, not just what it holds:

- `lookupConfig({ cwd }, name)` — resolve the origin without reading the file
- `resolveConfig({ cwd, ui }, name)` — the config plus its provenance
- `loadConfig`, `readConfigFile`, `getConfigFilenames`, `getConfigFormat`, `describeConfigSource`

A resolved `source` is `{ type: 'file', path, format }`, `{ type: 'package.json', path, property }`,
or `{ type: 'none' }`. These are read-only; writing config back to disk is not supported yet.

**`--show-config` (#317)**

A cli declaring `config` now accepts `--show-config`, which prints the resolved config and where it
was loaded from — the matching file path, the `package.json` property, or that nothing was found.
Clis without config do not advertise the option.
