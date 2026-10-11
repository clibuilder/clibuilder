/**
 * `@clibuilder/axi` is folded into clibuilder 12 and is no longer developed.
 *
 * - The value helpers (`truncateText`, `truncateList`, `orEmpty`, `fullOption`, `homeHeader`, `collapseHome`)
 *   are re-exported from `clibuilder/axi`; import them from there.
 * - The output, error, format and usage parts are built into clibuilder 12: return a value or
 *   `result()` / `document()` / `empty()` from `run()`, read the global `--format` from `this.format`,
 *   throw a `CliError`, and usage errors are ranked and coded by core.
 *
 * @packageDocumentation
 */
import { exitCodes as coreExitCodes } from 'clibuilder'

/**
 * The exit codes a clibuilder cli uses.
 *
 * @deprecated import `exitCodes` from `clibuilder` or `clibuilder/axi` instead.
 */
export const exitCodes: typeof coreExitCodes = coreExitCodes
export * from './error.js'
export * from './format.js'
export * from './help.js'
export * from './home.js'
export * from './output.js'
export * from './text.js'
export * from './truncate.js'
export * from './usage.js'
