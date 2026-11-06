/**
 * The single place an answer is turned into text.
 * Imports nothing from the framework (axi-native RFC section 4.1).
 */

import { encode as encodeToon, rawString } from '@toon-format/toon'
import { renderText } from './text.js'

/**
 * The formats an answer is encoded in.
 * `toon` is the default, `json` survives a pipe into `jq`, and `text` is for a person.
 */
export type Format = 'toon' | 'json' | 'text'

export const formats: readonly Format[] = ['toon', 'json', 'text']

/**
 * Encodes `value` in `format`, without a trailing newline.
 *
 * `toon` uses TOON only for collections (change 1 of the AXI conventions): an array, at any depth, is encoded
 * by the official `@toon-format/toon` encoder, and a string field outside any array is a plain `key: value` line.
 * The output is still TOON: a TOON decoder reads it back to the same value.
 */
export function encode(value: object, format: Format): string {
	if (format === 'json') return JSON.stringify(value)
	if (format === 'text') return renderText(value)
	return encodeToon(value, { replacer: plainLine })
}

// the path holds a number for each array the value sits in, so only a field of an object outside any array is plain
function plainLine(_key: string, value: unknown, path: readonly (string | number)[]) {
	if (typeof value !== 'string' || path.length === 0 || path.some((p) => typeof p === 'number')) return value
	return readsBackAsIs(value) ? rawString(value) : value
}

/**
 * Whether a TOON decoder reads `value`, written unquoted after `key: `, back as the same string.
 * Quoted are: the empty string, edge whitespace, control characters such as a newline, a leading `"`,
 * a leading `#` (the encoder keeps it for comments), and what reads as another type:
 * `true`, `false`, `null`, a number and `[]`.
 */
function readsBackAsIs(value: string): boolean {
	if (value === '' || value === '[]' || value.startsWith('"') || value.startsWith('#')) return false
	if (/^\s|\s$/.test(value) || hasControlCharacter(value)) return false
	if (value === 'true' || value === 'false' || value === 'null') return false
	// the official encoder's pattern for a string that looks like a number, wider than what its decoder reads as one
	return !/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)
}

function hasControlCharacter(value: string) {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i)
		if (code < 0x20 || code === 0x7f) return true
	}
	return false
}

export type ErrorFields = {
	message: string
	code: string
	details?: Record<string, unknown> | undefined
	help?: readonly string[] | undefined
}

/** The error as a flat value: `error`, `code`, the `details` fields, then `help` (left out when empty). Keys match `@clibuilder/axi`'s `errorOutput` and axi-sdk-js. */
export function errorOutput({ message, code, details, help }: ErrorFields): Record<string, unknown> {
	const output: Record<string, unknown> = { error: message, code, ...details }
	if (help && help.length > 0) output.help = [...help]
	return output
}
