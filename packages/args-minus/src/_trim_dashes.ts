import { DASH_CHAR_CODE } from './_constants.js'
import { StringCharCodeAt, StringSlice } from './_primordials.js'

export function trimDashes(arg: string) {
	const len = arg.length
	let i = 0
	for (; i < len; i++) {
		if (StringCharCodeAt.call(arg, i) !== DASH_CHAR_CODE) break
	}
	return [StringSlice.call(arg, i), i] as const
}
