import { encode } from '@toon-format/toon'
import * as clibuilder from 'clibuilder'
import { CliError, exitCodes } from 'clibuilder'
import { type ErrorReport, errorOutput } from './error.js'
import type { OutputFormat } from './format.js'
import { type Help, helpLines, withHelp } from './help.js'
import { renderText } from './text.js'

/**
 * Where a result is written; `process.stdout` unless a caller passes its own.
 *
 * @deprecated return a value, `result()`, `document()` or `empty()` from `run()`; clibuilder 12 writes it on stdout. @clibuilder/axi is no longer developed.
 */
export type OutputWriter = { write(chunk: string): unknown }

/**
 * Encodes a result in the given format, without writing it anywhere.
 *
 * @deprecated return a value or `result()` from `run()`; clibuilder 12 encodes it in the resolved `--format`. @clibuilder/axi is no longer developed.
 */
export function encodeResult(value: object, format: OutputFormat): string {
	if (format === 'json') return JSON.stringify(value)
	return format === 'text' ? renderText(value) : encode(value)
}

/**
 * The single stdout boundary: internal logic stays on plain objects, encoding happens here.
 *
 * @deprecated return a value or `result()` from `run()`; clibuilder 12 writes it in the resolved `--format`. @clibuilder/axi is no longer developed.
 */
export function writeResult(value: object, format: OutputFormat, stdout: OutputWriter = process.stdout): void {
	stdout.write(`${encodeResult(value, format)}\n`)
}

/**
 * Writes a document exactly as read, bypassing the encoders.
 *
 * @deprecated return `document(content)` from `clibuilder` in `run()`. @clibuilder/axi is no longer developed.
 */
export function writeDocument(content: string, stdout: OutputWriter = process.stdout): void {
	stdout.write(content.endsWith('\n') ? content : `${content}\n`)
}

/**
 * Encodes an error in the given format, without writing it anywhere.
 *
 * @deprecated throw a `CliError` from `clibuilder`; core renders it in the resolved `--format`. @clibuilder/axi is no longer developed.
 */
export function encodeError(report: ErrorReport, format: OutputFormat): string {
	return encodeResult(errorOutput(report), format)
}

/**
 * Writes an error on stdout and returns the exit code the CLI should end with.
 *
 * @deprecated throw a `CliError` from `clibuilder`; core renders it once on stdout. @clibuilder/axi is no longer developed.
 */
export function writeError(report: ErrorReport, format: OutputFormat, stdout: OutputWriter = process.stdout): number {
	stdout.write(`${encodeError(report, format)}\n`)
	return report.exitCode ?? exitCodes.error
}

/**
 * Replaces the default rendering of a result for one or more formats. The returned string is
 * written as is, like {@link writeDocument}.
 *
 * @deprecated use `result(value, { render })` from `clibuilder`. @clibuilder/axi is no longer developed.
 */
export type OutputRenderers<T> = Partial<Record<OutputFormat, (value: T) => string>>

/**
 * How {@link Output.result} writes a value: per-format renderers, and the next steps to suggest.
 *
 * @deprecated use `result.Options` from `clibuilder`. @clibuilder/axi is no longer developed.
 */
export type ResultOptions<T> = OutputRenderers<T> & {
	/** Next-step suggestions, written after the result under `help`. */
	help?: Help | undefined
}

/**
 * What {@link Output.result} returns: return it from `run()`, and `parse()` resolves to the value.
 *
 * With clibuilder 11.6 or later it is an answer marked as already written, so clibuilder's result channel
 * (`cli({ output: 'axi' })`) does not print it a second time. With an older clibuilder it is the value itself.
 *
 * @deprecated use `Answer` from `clibuilder`. @clibuilder/axi is no longer developed.
 */
export type OutputResult<T> = T | { readonly value: T }

/**
 * @deprecated return `result()`, `document()` or `empty()` from `clibuilder` in `run()`, and throw a `CliError` for a failure. @clibuilder/axi is no longer developed.
 */
export type Output = {
	/** The format this output writes, with the default filled in. */
	readonly format: OutputFormat
	/**
	 * Writes `value` in the output's format and returns it for `run()` to return.
	 * `options.help` adds next-step suggestions; `options.toon` / `json` / `text` replace the rendering.
	 * With clibuilder 11.6 or later the value is marked as already written, so it prints once.
	 */
	result<T extends object>(value: T, options?: ResultOptions<T>): OutputResult<T>
	/** Writes a document verbatim, whatever the format. */
	document(content: string): void
	/**
	 * Writes a structured error on stdout and returns a `CliError` for the command to throw.
	 */
	error(report: ErrorReport): CliError
}

/**
 * Binds the parsed `--format` to the writers, so a command picks the format once and writes
 * through it.
 *
 * @param format The command's parsed `format` argument. `undefined` falls back to `toon`.
 *
 * @example
 * ```ts
 * run(args) {
 * 	return createOutput(args.format).result({ plugins })
 * }
 * ```
 *
 * @deprecated return a value, `result()`, `document()` or `empty()` from `clibuilder` in `run()`, read the format from `this.format`, and throw a `CliError` instead of `output.error()`. @clibuilder/axi is no longer developed.
 */
export function createOutput(format: OutputFormat | undefined, options: { stdout?: OutputWriter } = {}): Output {
	const resolved = format ?? 'toon'
	const stdout = options.stdout ?? process.stdout
	return {
		format: resolved,
		result(value, options) {
			const render = options?.[resolved]
			const help = helpLines(options?.help)
			if (!render) writeResult(withHelp(value, help), resolved, stdout)
			else {
				const body = render(value)
				if (help.length === 0) writeDocument(body, stdout)
				else {
					const separator = body.endsWith('\n') ? '\n' : '\n\n'
					writeDocument(`${body}${separator}${encodeResult({ help }, resolved)}`, stdout)
				}
			}
			return written(value)
		},
		document(content) {
			writeDocument(content, stdout)
		},
		error(report) {
			const exitCode = writeError(report, resolved, stdout)
			// already written above, so clibuilder must not report it again.
			// `CliError.reported` is new in clibuilder 11.6; an older one still gets a plain `CliError`.
			return typeof CliError.reported === 'function'
				? CliError.reported(exitCode, report.message)
				: new CliError(report.message, { exitCode })
		}
	}
}

/**
 * Marks a value this package already wrote, so clibuilder's result channel prints nothing more for it
 * and `parse()` resolves to the value: the same `Symbol.for` key clibuilder's `result()` answers carry.
 *
 * The result channel is new in clibuilder 11.6, detected by its `result` export.
 * An older clibuilder prints no returned value, so the value itself is returned.
 */
function written<T>(value: T): OutputResult<T> {
	if (typeof (clibuilder as { result?: unknown }).result !== 'function') return value
	return { [Symbol.for('clibuilder.answer')]: 'written', value } as { readonly value: T }
}
