import { type Help, helpLines } from './help.js'

/**
 * A failure as an agent reads it: what went wrong, a stable code to branch on, and what to run
 * instead.
 */
export type ErrorReport = {
	/** What went wrong, in the CLI's own terms — never a dependency's raw output. */
	message: string
	/**
	 * A stable, kebab-case code that tells this failure apart from the others the command can
	 * report, such as `not-found` or `unknown-option`.
	 */
	code: string
	/**
	 * The commands that fix it, written under `help` like a result's next steps. Name the fix,
	 * not "see --help".
	 */
	help?: Help | undefined
	/**
	 * Extra fields an agent can act on, such as the candidates an ambiguous name matched. Written
	 * between `code` and `help`.
	 */
	details?: Record<string, unknown> | undefined
	/**
	 * The code the CLI exits with: `exitCodes.error` (1, the default) when the command could not
	 * complete, `exitCodes.usage` (2) when it was called wrong.
	 */
	exitCode?: number | undefined
}

/**
 * The error as a value: `error`, `code`, any details, then `help`, flat so it reads the same in
 * every format — `error: ...` / `code: ...` / `help[1]: ...` in TOON.
 */
export function errorOutput(report: ErrorReport): Record<string, unknown> {
	const output: Record<string, unknown> = { error: report.message, code: report.code, ...report.details }
	const help = helpLines(report.help)
	if (help.length > 0) output.help = help
	return output
}
