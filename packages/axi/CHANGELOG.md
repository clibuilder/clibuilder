# @clibuilder/axi

## 0.3.0

### Minor Changes

- b5ec612: `@clibuilder/axi` is folded into `clibuilder` 12, and every export is now `@deprecated` with its replacement.
  
  Breaking:
  
  - The peer dependency is `clibuilder` `^12`. *Migrate:* upgrade `clibuilder` to 12.
  - `fullOption` is re-exported from `clibuilder/axi` and declared with `t.boolean().optional()`, not zod. `fullOption.type.parse()` is gone. *Migrate:* use `fullOption` as a command option only.
  - The package is ESM-only: the CommonJS build in `cjs/` is gone. `require('@clibuilder/axi')` still works on Node.js 20.19 and later through `require(esm)`. The `exports` entry is `{ types, default }` pointing at `esm/`, and the top-level `main` field is removed. TypeScript reports error TS1479 (an ES module cannot be imported with `require`) in a CommonJS file compiled with `module: node16`, or with `module: nodenext` before TypeScript 5.8. The declarations were already ESM in 11.x, so this is not new, but it now matches what Node does. *Migrate:* use TypeScript 5.8 or later with `module: nodenext`. `module: commonjs` with `moduleResolution: node10` still resolves the root entry through the top-level `types` field.
  - `formatOption` and `defineFormatOption()` declare their `type` with `t.enum(formats).optional()` instead of a zod enum. `formatOption.type.parse()` and `.safeParse()` are gone. *Migrate:* delete the local option and read `this.format`: clibuilder 12 declares a global `--format` and fails at startup on a command that declares its own.
  
  `truncateText`, `truncateList`, `defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader`, `collapseHome` and `exitCodes` are re-exported from `clibuilder/axi` and work as before. *Migrate:* import them from `clibuilder/axi`.
  
  The other exports keep working and map to built-in features:
  
  - `createOutput`, `writeResult`, `encodeResult`, `writeDocument`, `withHelp`, `helpLines`: return the value, `result(value, { help, render })`, `document()` or `empty()` from `run()`.
  - `output.error`, `writeError`, `encodeError`, `errorOutput`, `ErrorReport`: throw a `CliError` with `code`, `help` and `details`.
  - `formatOption`, `defineFormatOption`, `parseFormat`, `formats`, `OutputFormat`, `renderText`: the global `--format`; read `this.format`, set the default with `cli({ format })`, and use `cli.Format` for the type.
  - `createUsageErrorHandler`, `describeUsageError`: core ranks and codes usage errors itself; remove the `onUsageError` handler.
  
  Until you migrate, `output` works with clibuilder 12's default `axi` output without printing twice: `output.result()` returns the value marked as already written, so clibuilder does not print it again, and `parse()` still resolves to the value. Its return type is now `OutputResult<T>`. `output.error()` returns a `CliError.reported()`, so the error is reported once, on stdout, and clibuilder does not log it again on stderr. In `output: 'console'` and with a custom writer, `output.result()` writes as before.

### Patch Changes

- Updated dependencies [6809fee]
- Updated dependencies [b5ec612]
- Updated dependencies [31eec28]
- Updated dependencies [a05bdfa]
- Updated dependencies [ad6b788]
- Updated dependencies [20aaa9c]
- Updated dependencies [0e61d44]
- Updated dependencies [e1fb5ef]
- Updated dependencies [ac9c2fb]
- Updated dependencies [5dbee67]
- Updated dependencies [73adba2]
- Updated dependencies [af37209]
- Updated dependencies [8194d17]
- Updated dependencies [e395442]
- Updated dependencies [ecb0db4]
- Updated dependencies [fe84abc]
- Updated dependencies [18b7725]
- Updated dependencies [1d2d7a3]
- Updated dependencies [6f59df9]
- Updated dependencies [36d0a1d]
- Updated dependencies [40d26cf]
- Updated dependencies [b27bf6f]
  - clibuilder@12.0.0

## 0.2.1

### Patch Changes

- 8cf4fc8: `describeUsageError` reads whether an argument declared with clibuilder's `t` is optional, as it does for a zod argument.
- Updated dependencies [8cf4fc8]
- Updated dependencies [16562e2]
- Updated dependencies [791e8ca]
  - clibuilder@11.5.0

## 0.2.0

### Minor Changes

- 959f928: Complete the AXI output conventions, from what was learned building agent-facing output by hand across the `cyberuni` repos (see `packages/axi/docs/findings`):
  
  - Errors on stdout: `output.error(report)` writes `error`, `code`, details and `help` in the caller's format and returns a `CliError` to throw; `writeError`, `encodeError`, `errorOutput` and `ErrorReport` for use outside a command.
  - Usage errors: `createUsageErrorHandler()` plugs into `clibuilder`'s `onUsageError` and reports an unknown option, a missing argument or a bad value as one structured error with exit code 2, listing what is valid. `describeUsageError()` codes a single one.
  - Next steps: `output.result(value, { help })` writes `help[N]:` suggestions after the result; `withHelp` and `helpLines`.
  - Truncation and counts: `fullOption` (`--full`), `truncateText` (`... (truncated, N chars total)`), and `truncateList` (`count: N of M total`).
  - Empty states: `orEmpty(items, message)` says the zero instead of printing an empty list.
  - Home view: `homeHeader({ description })` and `collapseHome(path)`.
  
  The `clibuilder` peer dependency is now `^11.2.0`, the release that added `onUsageError`.

### Patch Changes

- Updated dependencies [8d848ad]
  - clibuilder@11.3.3

## 0.1.0

### Minor Changes

- cca2791: First release of `@clibuilder/axi`: the agent-facing output half of AXI for `clibuilder` CLIs.

  - `formatOption` / `defineFormatOption()`: a `--format` option (`toon` | `json` | `text`, default `toon`) to spread into a command's options; an unknown value is a usage error.
  - `createOutput(args.format)`: writes a result in the parsed format and returns it; a per-format renderer or `document()` writes verbatim.
  - `writeResult`, `writeDocument`, `encodeResult`, `renderText`, `parseFormat`, `formats`, `OutputFormat`.
  - Re-exports `exitCodes` from `clibuilder`, so an agent-facing command has one import.
