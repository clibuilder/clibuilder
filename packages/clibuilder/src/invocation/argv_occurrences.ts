import type { parseArgv } from './argv.js'

/**
 * One option as it appeared on the command line.
 *
 * `inline` is the value given with the option itself (`--key=value`, or the implied `true`
 * of a bundled short flag). `following` is every non-option token after it, up to the next
 * option. The parser does not know how many of them the option takes: that depends on the
 * option's declared type, which only the command knows.
 */
export type OptionOccurrence = {
	key: string
	inline: string[]
	following: string[]
}

/**
 * The options of a `parseArgv` result, in command line order.
 *
 * Kept aside rather than on the result, because the result's shape is public.
 */
export const optionOccurrences = new WeakMap<parseArgv.Result, OptionOccurrence[]>()
