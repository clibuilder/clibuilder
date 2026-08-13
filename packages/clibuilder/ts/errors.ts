import type { cli } from './cli.js'
import type { lookupCommand } from './lookup_command.js'

/**
 * The exit codes a clibuilder cli uses.
 *
 * They follow the AXI (Agent eXperience Interface) convention so an agent
 * driving the cli through a shell can tell the three cases apart:
 * the command did what was asked, the command failed, or the command was
 * called wrong and should be called again differently.
 */
export const exitCodes = {
	/**
	 * The command did what was asked, including no-ops.
	 */
	success: 0,
	/**
	 * The command was called correctly but could not complete.
	 */
	error: 1,
	/**
	 * The command was called incorrectly: an unknown option, a missing
	 * argument, a value of the wrong type. Retrying the same invocation
	 * cannot help.
	 */
	usage: 2
} as const

const cliErrorBrand: unique symbol = Symbol.for('clibuilder.CliError')

export namespace CliError {
	export type Options = {
		/**
		 * The code the cli exits with. Defaults to `exitCodes.error` (1).
		 * Use `exitCodes.usage` (2) when the invocation itself was wrong.
		 */
		exitCode?: number
		/**
		 * What the caller should do about it.
		 * Printed after the message, one line each.
		 */
		help?: string | string[]
		cause?: unknown
	}
}

/**
 * Throw this from a command's `run()` to fail the cli.
 *
 * The message and the help lines are printed through the command's `ui`,
 * and the cli exits with `exitCode`. `parse()` resolves to `undefined`
 * instead of rejecting, so the failure is reported rather than surfacing
 * as an unhandled rejection with a stack trace.
 *
 * @example
 * ```ts
 * run({ field }) {
 * 	if (!fields.includes(field)) {
 * 		throw new CliError(`unknown field "${field}"`, {
 * 			exitCode: exitCodes.usage,
 * 			help: `valid fields: ${fields.join(', ')}`
 * 		})
 * 	}
 * }
 * ```
 */
export class CliError extends Error {
	override readonly name = 'CliError'
	readonly exitCode: number
	readonly help: string[]
	/**
	 * The error this one wraps, if any.
	 * Declared here rather than taken from `ErrorOptions` to keep the
	 * package compiling against its `ES2020` target.
	 */
	readonly cause?: unknown
	// branded so the check survives a duplicated `clibuilder` in the
	// dependency tree, where `instanceof` compares two different classes.
	readonly [cliErrorBrand] = true

	constructor(message: string, options?: CliError.Options) {
		super(message)
		this.exitCode = options?.exitCode ?? exitCodes.error
		this.help = options?.help === undefined ? [] : Array.isArray(options.help) ? options.help : [options.help]
		this.cause = options?.cause
	}
}

export function isCliError(err: unknown): err is CliError {
	return !!err && typeof err === 'object' && (err as any)[cliErrorBrand] === true
}

/**
 * Describes one `lookupCommand` error in the terms the caller used:
 * which option or argument was wrong, and what was expected.
 *
 * @param command the command the error was found on, used to tell an
 * argument name apart from an option name.
 */
export function formatLookupError(error: lookupCommand.Error, command: cli.Command): string {
	switch (error.type) {
		case 'invalid-key':
			return `unknown option ${formatOption(error.key)}`
		case 'missing-argument':
			return `missing required argument <${error.name}>`
		case 'extra-arguments':
			return `unexpected argument${error.values.length > 1 ? 's' : ''}: ${error.values.join(', ')}`
		case 'invalid-value':
			return `invalid value for ${formatKey(error.key, command)}: ${error.message}, received "${error.value}"`
		case 'expect-single':
			return `${formatKey(error.key, command)} expects a single value, received: ${toArray(error.value).join(', ')}`
	}
}

function formatKey(key: string, command: cli.Command) {
	return command.arguments?.some((a) => a.name === key) ? `argument <${key}>` : `option ${formatOption(key)}`
}

function formatOption(key: string) {
	return key.length === 1 ? `-${key}` : `--${key}`
}

function toArray(value: any) {
	return Array.isArray(value) ? value : [value]
}
