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
const reportedBrand: unique symbol = Symbol.for('clibuilder.CliError.reported')

/**
 * The keys the report is rendered under. A `details` field may not reuse one.
 */
const reservedKeys = ['error', 'code', 'help']

export namespace CliError {
	/**
	 * A value in `details`: a scalar, or a list of scalars.
	 * The record stays flat so it reads the same in every format.
	 */
	export type DetailValue = string | number | boolean | null | ReadonlyArray<string | number | boolean | null>

	/**
	 * Extra fields an agent can act on, such as the path that was not found
	 * or the names an ambiguous one matched.
	 */
	export type Details = Record<string, DetailValue>

	export type Options = {
		/**
		 * The code the cli exits with: any integer from 1 to 255.
		 * Defaults to `exitCodes.error` (1).
		 * Use `exitCodes.usage` (2) when the invocation itself was wrong.
		 * `0` is rejected, since an error must not exit 0.
		 */
		exitCode?: number | undefined
		/**
		 * A stable, kebab-case string that says which failure this is, such as `not-found`.
		 * The exit code says *that* it failed; the code says *which* failure.
		 * Defaults to `error`.
		 */
		code?: string | undefined
		/**
		 * Extra fields an agent can act on, rendered between `code` and `help`.
		 * Flat: each value is a scalar or a list of scalars.
		 * A key may not be `error`, `code` or `help`.
		 */
		details?: Details | undefined
		/**
		 * What the caller should do about it, such as the command that fixes it.
		 * Printed after the message, one line each.
		 */
		help?: string | readonly string[] | undefined
		cause?: unknown
	}

	/**
	 * The whole report as one object: `new CliError(report)`.
	 */
	export type Report = Options & {
		/**
		 * What went wrong, in the cli's own terms.
		 */
		message: string
	}
}

/**
 * Throw this from a command's `run()` to fail the cli.
 *
 * It is the structured report of the failure:
 *
 * - `message`: what went wrong.
 * - `code`: a stable kebab-case string that says which failure it is (default `error`).
 * - `details`: a flat record of extra fields an agent can act on (default `{}`).
 * - `help`: what to do about it, as a list of lines (default `[]`).
 * - `exitCode`: any integer from 1 to 255 (default `exitCodes.error`, 1).
 *
 * In the default `cli({ output: 'axi' })` the report is rendered once on stdout,
 * in the cli's format, as `error`, `code`, the `details` fields, then `help`, and nothing is
 * written to stderr for it. With `cli({ output: 'console' })` the message and the help lines
 * are printed through the command's `ui`, on stderr.
 *
 * Either way the cli exits with `exitCode`, and `parse()` resolves to that `exitCode`
 * instead of rejecting, so the failure is reported rather than surfacing
 * as an unhandled rejection with a stack trace.
 *
 * @example
 * ```ts
 * run({ field }) {
 * 	if (!fields.includes(field)) {
 * 		throw new CliError(`unknown field "${field}"`, {
 * 			code: 'unknown-field',
 * 			exitCode: exitCodes.usage,
 * 			details: { field },
 * 			help: `valid fields: ${fields.join(', ')}`
 * 		})
 * 	}
 * }
 * ```
 */
export class CliError extends Error {
	/**
	 * A `CliError` for a failure that was already reported, such as by
	 * `@clibuilder/axi`'s `output.error()`.
	 *
	 * The cli exits with `exitCode`, and nothing is printed for it,
	 * neither on stdout nor on stderr, so the failure is not reported twice.
	 *
	 * @param message kept on the error for a caller that reads it, never printed.
	 */
	static reported(exitCode: number = exitCodes.error, message = 'the error was already reported'): CliError {
		const err = new CliError(message, { exitCode })
		;(err as any)[reportedBrand] = true
		return err
	}

	override readonly name = 'CliError'
	readonly exitCode: number
	readonly code: string
	readonly details: CliError.Details
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

	constructor(report: CliError.Report)
	constructor(message: string, options?: CliError.Options)
	constructor(messageOrReport: string | CliError.Report, options?: CliError.Options) {
		const report = typeof messageOrReport === 'string' ? { ...options, message: messageOrReport } : messageOrReport
		super(report.message)
		this.exitCode = validateExitCode(report.exitCode ?? exitCodes.error)
		this.code = validateCode(report.code ?? 'error')
		this.details = validateDetails(report.details ?? {})
		this.help = report.help === undefined ? [] : typeof report.help === 'string' ? [report.help] : [...report.help]
		this.cause = report.cause
	}
}

export function isCliError(err: unknown): err is CliError {
	return !!err && typeof err === 'object' && (err as any)[cliErrorBrand] === true
}

/**
 * Whether `err` is a `CliError` from `CliError.reported()`, which renders nothing.
 */
export function isReportedCliError(err: CliError) {
	return (err as any)[reportedBrand] === true
}

function validateExitCode(exitCode: number) {
	if (Number.isInteger(exitCode) && exitCode >= 1 && exitCode <= 255) return exitCode
	throw new RangeError(`CliError exitCode must be an integer from 1 to 255, received ${exitCode}`)
}

function validateCode(code: string) {
	if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) return code
	throw new RangeError(`CliError code must be a kebab-case string such as "not-found", received "${code}"`)
}

function validateDetails(details: CliError.Details) {
	for (const key of reservedKeys) {
		if (key in details) throw new RangeError(`CliError details may not have the key "${key}"`)
	}
	return { ...details }
}
