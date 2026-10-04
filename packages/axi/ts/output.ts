import { encode } from '@toon-format/toon'
import type { OutputFormat } from './format.js'
import { renderText } from './text.js'

/** Where a result is written; `process.stdout` unless a caller passes its own. */
export type OutputWriter = { write(chunk: string): unknown }

/** Encodes a result in the given format, without writing it anywhere. */
export function encodeResult(value: object, format: OutputFormat): string {
	if (format === 'json') return JSON.stringify(value)
	return format === 'text' ? renderText(value) : encode(value)
}

/** The single stdout boundary: internal logic stays on plain objects, encoding happens here. */
export function writeResult(value: object, format: OutputFormat, stdout: OutputWriter = process.stdout): void {
	stdout.write(`${encodeResult(value, format)}\n`)
}

/**
 * Writes a document exactly as read, bypassing the encoders — a Markdown body run through TOON or
 * the text renderer comes back as one escaped line. A command writes one or the other, never both.
 */
export function writeDocument(content: string, stdout: OutputWriter = process.stdout): void {
	stdout.write(content.endsWith('\n') ? content : `${content}\n`)
}

/**
 * Replaces the default rendering of a result for one or more formats. The returned string is
 * written as is, like {@link writeDocument}.
 */
export type OutputRenderers<T> = Partial<Record<OutputFormat, (value: T) => string>>

export type Output = {
	/** The format this output writes, with the default filled in. */
	readonly format: OutputFormat
	/**
	 * Writes `value` in the output's format and returns it, so a command can
	 * `return output.result(report)` and stay testable through its return value.
	 */
	result<T extends object>(value: T, renderers?: OutputRenderers<T>): T
	/** Writes a document verbatim, whatever the format. */
	document(content: string): void
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
 */
export function createOutput(format: OutputFormat | undefined, options: { stdout?: OutputWriter } = {}): Output {
	const resolved = format ?? 'toon'
	const stdout = options.stdout ?? process.stdout
	return {
		format: resolved,
		result(value, renderers) {
			const render = renderers?.[resolved]
			if (render) writeDocument(render(value), stdout)
			else writeResult(value, resolved, stdout)
			return value
		},
		document(content) {
			writeDocument(content, stdout)
		}
	}
}
