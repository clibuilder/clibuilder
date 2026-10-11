/**
 * The result channel: what `run()` returns, and how it is printed under `output: 'axi'`.
 * Imports nothing from the framework (axi-native RFC section 4.1).
 */

import { encode, type Format } from './encode.js'

// a `Symbol.for` key, so an answer from one copy of clibuilder is recognized by another in the same process
const answerKey: unique symbol = Symbol.for('clibuilder.answer') as any

/** Renders a result for one format. The string it returns is written as is, like a document. */
export type Renderer<T> = (value: T) => string

export namespace result {
	export type Options<T> = {
		/**
		 * Next-step suggestions, encoded after the result as `help[N]`.
		 * One string or several; none, or an empty list, leaves the key out.
		 */
		help?: string | readonly string[] | undefined
		/**
		 * Replaces the encoder for one or more formats.
		 * The string a renderer returns is written verbatim, followed by the encoded `help`.
		 */
		render?: Partial<Record<Format, Renderer<T>>> | undefined
	}
}

export namespace empty {
	export type Options = {
		/** Next-step suggestions, encoded after the empty state as `help[N]`. */
		help?: string | readonly string[] | undefined
	}
}

type Tagged<Kind extends string, Fields> = { readonly [answerKey]: Kind } & Fields

/** An answer returned from `run()`: `parse()` resolves to its `value`. */
export type Answer<T = unknown> =
	| Tagged<
			'result',
			{ readonly value: T; readonly help: readonly string[]; readonly render: result.Options<T>['render'] }
	  >
	| Tagged<'document', { readonly value: string }>
	| Tagged<'empty', { readonly value: string; readonly help: readonly string[] }>
	| Tagged<'written', { readonly value: T }>

/**
 * Marks `value` as the result of `run()`, with next-step suggestions and per-format renderers.
 *
 * Under `output: 'axi'` the result is encoded in `this.format` on stdout, with `help` as a `help[N]` list
 * inside it. A renderer for the format replaces the encoder: its string is written verbatim, and the
 * `help` follows it, encoded. `parse()` resolves to `value`.
 *
 * @example
 * ```ts
 * run() {
 * 	return result({ items }, { help: 'Run `my-cli show <id>` for one', render: { text: (v) => table(v.items) } })
 * }
 * ```
 */
export function result<T>(value: T, options: result.Options<T> = {}): Answer<T> {
	return { [answerKey]: 'result', value, help: helpLines(options.help), render: options.render }
}

/**
 * Marks `content` as a document: under `output: 'axi'` it is written on stdout exactly as given,
 * whatever the format, ending on a newline. `parse()` resolves to `content`.
 *
 * For output that is already the answer, such as Markdown, a diff or a file.
 */
export function document(content: string): Answer<string> {
	return { [answerKey]: 'document', value: String(content) }
}

/**
 * A success with nothing to report, said explicitly so an agent does not retry to make sure.
 *
 * Under `output: 'axi'` it is encoded in `this.format` on stdout as `empty: <message>`, with `help` after it.
 * The cli exits 0. `parse()` resolves to `message`.
 *
 * @example
 * ```ts
 * if (items.length === 0) return empty('0 open tasks found in this repository')
 * ```
 */
export function empty(message: string, options: empty.Options = {}): Answer<string> {
	return { [answerKey]: 'empty', value: String(message), help: helpLines(options.help) }
}

/**
 * An answer that was already written by its producer, such as `@clibuilder/axi`'s `output.result()`.
 * Nothing is printed for it, and `parse()` resolves to `value`.
 *
 * Internal: the shape is shared with `@clibuilder/axi` through the `Symbol.for` key, not exported.
 */
export function written<T>(value: T): Answer<T> {
	return { [answerKey]: 'written', value }
}

export function isAnswer(value: unknown): value is Answer {
	return typeof value === 'object' && value !== null && typeof (value as any)[answerKey] === 'string'
}

export function answerValue(returned: unknown): any {
	return isAnswer(returned) ? returned.value : returned
}

/**
 * The text written on stdout for what `run()` returned, ending on one newline, or `undefined` when nothing is printed.
 * A string is written verbatim, an object is encoded, and an array or scalar is encoded under the `result` key
 * so `help` has a place beside it.
 */
export function printAnswer(returned: unknown, format: Format): string | undefined {
	if (returned === undefined) return undefined
	if (!isAnswer(returned)) return print(returned, [], format)
	switch (returned[answerKey]) {
		case 'written':
			return undefined
		case 'document':
			return line(returned.value)
		case 'empty':
			return line(encode(withHelp({ empty: returned.value }, returned.help), format))
		case 'result': {
			const render = returned.render?.[format]
			if (render) return withRenderedHelp(render(returned.value), returned.help, format)
			return print(returned.value, returned.help, format)
		}
	}
}

function print(value: unknown, help: readonly string[], format: Format) {
	if (typeof value === 'string') return withRenderedHelp(value, help, format)
	return line(encode(withHelp(toRecord(value), help), format))
}

function withRenderedHelp(body: string, help: readonly string[], format: Format) {
	if (help.length === 0) return line(body)
	const separator = body.endsWith('\n') ? '\n' : '\n\n'
	return line(`${body}${separator}${encode({ help: [...help] }, format)}`)
}

function toRecord(value: unknown): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>
	return { result: value }
}

// `help` goes last, and a `help` key on the value gives way to it
function withHelp(value: Record<string, unknown>, help: readonly string[]) {
	if (help.length === 0) return value
	const { help: _, ...rest } = value
	return { ...rest, help: [...help] }
}

function helpLines(help: string | readonly string[] | undefined): string[] {
	if (help === undefined) return []
	return typeof help === 'string' ? [help] : [...help]
}

function line(text: string) {
	return text.endsWith('\n') ? text : `${text}\n`
}
