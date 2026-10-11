/**
 * `clibuilder/axi`: helpers that shape the value a command returns for an agent.
 *
 * Core already renders errors, usage errors and results the AXI way.
 * This subpath adds truncation, counts, the empty state and the home header,
 * plus the result channel and exit codes so one import covers a command.
 */
import { t } from 'args-minus'

export { CliError, exitCodes, isCliError } from './app/errors.js'
export * from './axi/index.js'
export { type Answer, document, empty, type Renderer, result } from './render/answer.js'

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
