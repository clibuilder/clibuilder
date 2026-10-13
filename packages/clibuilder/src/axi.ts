/**
 * `clibuilder/axi`: helpers that shape the value a command returns for an agent.
 *
 * Core already renders errors, usage errors and results the AXI way.
 * This subpath adds truncation, counts, the empty state and the home header,
 * plus the result channel and exit codes so one import covers a command.
 *
 * It also works without `cli()`: `encode`, `errorOutput` and `printAnswer` are the output contract,
 * and `runScript` runs a command headless, for a script that is not a cli.
 */
import { t } from 'args-minus'

export { CliError, exitCodes, isCliError } from './app/errors.js'
export * from './axi/index.js'
export { type Answer, document, empty, printAnswer, type Renderer, result } from './render/answer.js'
export { type ErrorFields, encode, errorOutput, type Format, formats } from './render/encode.js'
export { type HelpLine, type Placeholder, placeholder, type Ref, type RefsMode, ref } from './render/ref.js'
export { runScript } from './script/index.js'

/**
 * The `--full` option: the escape hatch from truncation. Add it to a command's options, and pass
 * `args.full` to {@link truncateText} and {@link truncateList}.
 *
 * @example
 * ```ts
 * options: { full: fullOption }
 * ```
 */
export const fullOption = {
	type: t.boolean().optional(),
	description: 'Show the complete output instead of truncating it'
}
