/**
 * The result channel: what `run()` returns, and how it is printed under `output: 'axi'`.
 * Imports nothing from the framework (axi-native RFC section 4.1).
 */

import { encode, type Format } from './encode.js'
import { type HelpLine, type RefResolver, type RefsMode, renderHelp } from './ref.js'

// a `Symbol.for` key, so an answer from one copy of clibuilder is recognized by another in the same process
const answerKey: unique symbol = Symbol.for('clibuilder.answer') as any

/** Renders a result for one format. The string it returns is written as is, like a document. */
export type Renderer<T> = (value: T) => string

export namespace result {
	export type Options<T> = {
		/**
		 * Next-step suggestions, encoded after the result as `help[N]`.
		 * One line or several; none, or an empty list, leaves the key out.
		 * A line is a string, or a `ref()` the runner renders as a command line.
		 */
		help?: HelpLine | readonly HelpLine[] | undefined
		/**
		 * Replaces the encoder for one or more formats.
		 * The string a renderer returns is written verbatim, followed by the encoded `help`.
		 */
		render?: Partial<Record<Format, Renderer<T>>> | undefined
	}
}

export namespace empty {
	export type Options = {
		/** Next-step suggestions, encoded after the empty state as `help[N]`. A line is a string or a `ref()`. */
		help?: HelpLine | readonly HelpLine[] | undefined
	}
}

type Tagged<Kind extends string, Fields> = { readonly [answerKey]: Kind } & Fields

/** An answer returned from `run()`: `parse()` resolves to its `value`. */
export type Answer<T = unknown> =
	| Tagged<
			'result',
			{ readonly value: T; readonly help: readonly HelpLine[]; readonly render: result.Options<T>['render'] }
	  >
	| Tagged<'document', { readonly value: string }>
	| Tagged<'empty', { readonly value: string; readonly help: readonly HelpLine[] }>
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

export namespace printAnswer {
	export type Options = {
		/** Renders a `ref()` as a command line. Defaults to the command path and its options, without a cli name. */
		resolve?: RefResolver | undefined
		/** `'help'` (default) renders refs as `help` strings; `'next'` encodes them as `next[N]{run,why}`. */
		refs?: RefsMode | undefined
	}
}

/**
 * The text written on stdout for what `run()` returned, ending on one newline, or `undefined` when nothing is printed.
 * A string is written verbatim, an object is encoded, and an array or scalar is encoded under the `result` key
 * so `help` has a place beside it.
 */
export function printAnswer(returned: unknown, format: Format, options: printAnswer.Options = {}): string | undefined {
	if (returned === undefined) return undefined
	const tail = (lines: readonly HelpLine[]) => renderHelp(lines, options.resolve, options.refs)
	if (!isAnswer(returned)) return print(returned, tail([]), format)
	switch (returned[answerKey]) {
		case 'written':
			return undefined
		case 'document':
			return line(returned.value)
		case 'empty':
			return line(encode(withHelp({ empty: returned.value }, tail(returned.help)), format))
		case 'result': {
			const render = returned.render?.[format]
			if (render) return withRenderedHelp(render(returned.value), tail(returned.help), format)
			return print(returned.value, tail(returned.help), format)
		}
	}
}

type Tail = ReturnType<typeof renderHelp>

function print(value: unknown, tail: Tail, format: Format) {
	if (typeof value === 'string') return withRenderedHelp(value, tail, format)
	return line(encode(withHelp(toRecord(value), tail), format))
}

function withRenderedHelp(body: string, tail: Tail, format: Format) {
	const rest = withHelp({}, tail)
	if (Object.keys(rest).length === 0) return line(body)
	const separator = body.endsWith('\n') ? '\n' : '\n\n'
	return line(`${body}${separator}${encode(rest, format)}`)
}

function toRecord(value: unknown): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>
	return { result: value }
}

// `help` and `next` go last, and a `help` or `next` key on the value gives way to them
function withHelp(value: Record<string, unknown>, { help, next }: Tail) {
	if (help.length === 0 && next.length === 0) return value
	const out: Record<string, unknown> = { ...value }
	if (help.length > 0) {
		delete out.help
		out.help = help
	}
	if (next.length > 0) {
		delete out.next
		out.next = next
	}
	return out
}

function helpLines(help: HelpLine | readonly HelpLine[] | undefined): HelpLine[] {
	if (help === undefined) return []
	return Array.isArray(help) ? [...help] : [help as HelpLine]
}

function line(text: string) {
	return text.endsWith('\n') ? text : `${text}\n`
}
