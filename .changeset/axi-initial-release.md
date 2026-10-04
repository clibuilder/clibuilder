---
'@clibuilder/axi': minor
---

First release of `@clibuilder/axi`: the agent-facing output half of AXI for `clibuilder` CLIs.

- `formatOption` / `defineFormatOption()`: a `--format` option (`toon` | `json` | `text`, default `toon`) to spread into a command's options; an unknown value is a usage error.
- `createOutput(args.format)`: writes a result in the parsed format and returns it; a per-format renderer or `document()` writes verbatim.
- `writeResult`, `writeDocument`, `encodeResult`, `renderText`, `parseFormat`, `formats`, `OutputFormat`.
- Re-exports `exitCodes` from `clibuilder`, so an agent-facing command has one import.
