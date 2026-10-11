/**
 * The single place an answer is turned into text.
 * Imports nothing from the framework (axi-native RFC section 4.1).
 */

import { encode as encodeToon } from '@toon-format/toon'
import { renderText } from './text.js'

/**
 * The formats an answer is encoded in.
 * `toon` is the default, `json` survives a pipe into `jq`, and `text` is for a person.
 */
export type Format = 'toon' | 'json' | 'text'

export const formats: readonly Format[] = ['toon', 'json', 'text']

/** Encodes `value` in `format`, without a trailing newline. `toon` uses the official `@toon-format/toon` encoder. */
export function encode(value: object, format: Format): string {
	if (format === 'json') return JSON.stringify(value)
	if (format === 'text') return renderText(value)
	return encodeToon(value)
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
