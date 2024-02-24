import { ArrayMap, StringCharCodeAt, StringSlice } from './_primordials.js'

export function tokenize(argv: string[]) {
	var index = 0
	return ArrayMap.call(argv, (raw) => {
		var [name, nameIndex] = extractName(raw)

		if (nameIndex >= 1 && name)
			return {
				type: 'option',
				index: index++,
				name,
				raw
			}
	})
}

function extractName(arg: string) {
	var len = arg.length
	for (var i = 0; i < len; i++) {
		if (StringCharCodeAt.call(arg, i) !== 45) break
	}
	return [StringSlice.call(arg, i), i] as const
}
