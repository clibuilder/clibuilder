import { ArrayForEach, ArrayPush, ArrayReduce, StringCharCodeAt, StringSlice } from './_primordials.js'

export interface OptionToken {
	kind: 'option'
	index: string
	name: string
	raw: string
}

export type Token = OptionToken
export function tokenize(argv: string[]) {
	return ArrayReduce.call(
		argv,
		(acc, raw, index) => {
			var [name, nameIndex] = extractName(raw)

			if (nameIndex === 1 && name)
				ArrayForEach.call(name, (name) =>
					ArrayPush.call(acc, {
						kind: 'option',
						index,
						name,
						raw: `-${name}`
					})
				)
			else if (nameIndex >= 2 && name)
				ArrayPush.call(acc, {
					kind: 'option',
					index,
					name,
					raw
				})

			index++
			return acc
		},
		[]
	)
}

function extractName(arg: string) {
	var len = arg.length
	for (var i = 0; i < len; i++) {
		if (StringCharCodeAt.call(arg, i) !== 45) break
	}
	return [StringSlice.call(arg, i), i] as const
}
