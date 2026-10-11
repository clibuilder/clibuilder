import type { parseArgv } from './argv.js'

/**
 * One option as it appeared on the command line.
 *
 * `inline` is the value given with the option itself (`--key=value`, or the implied `true` of a bundled short flag).
 * `following` is every non-option token after it, up to the next option: how many the option takes
 * depends on its declared type, which only the command knows.
 */
export type OptionOccurrence = {
	key: string
	/** The argv token that opened the option, e.g. `--key=value` or the whole `-abc` cluster. */
	raw: string
	inline: string[]
	following: string[]
}

// kept aside, not on the result, because the result's shape is public
export const optionOccurrences = new WeakMap<parseArgv.Result, OptionOccurrence[]>()
