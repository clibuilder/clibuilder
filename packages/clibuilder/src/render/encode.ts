/**
 * Encodes a value in one of the cli's output formats.
 *
 * The single place an answer is turned into text, so `--format` and the result channel
 * build on it. Imports nothing from the framework (axi-native RFC section 4.1).
 */

import { encode as encodeToon } from '@toon-format/toon'
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
 * `toon` is the official `@toon-format/toon` encoder for every value, single objects and errors included,
 * so the output cannot disagree with the spec.
 */
export function encode(value: object, format: Format): string {
	if (format === 'json') return JSON.stringify(value)
	if (format === 'text') return renderText(value)
	return encodeToon(value)
}

/**
 * The fields of an error report, as `CliError` carries them.
 */
export type ErrorFields = {
	message: string
	code: string
	details?: Record<string, unknown> | undefined
	help?: readonly string[] | undefined
}

/**
 * The error as a value: `error`, `code`, the `details` fields, then `help`,
 * flat so it reads the same in every format. `help` is left out when empty.
 *
 * The keys match `@clibuilder/axi`'s `errorOutput` and axi-sdk-js.
 */
export function errorOutput({ message, code, details, help }: ErrorFields): Record<string, unknown> {
	const output: Record<string, unknown> = { error: message, code, ...details }
	if (help && help.length > 0) output.help = [...help]
	return output
}
