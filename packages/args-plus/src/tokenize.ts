import { ArrayForEach, ArrayPush, ArrayReduce, StringCharCodeAt, StringSlice } from './_primordials.js'

export interface OptionToken {
	kind: 'option'
	index: number
	name: string
	raw: string
}

export interface OptionTerminatorToken {
	kind: 'option-terminator'
	index: number
}

export type Token = OptionToken | OptionTerminatorToken

export function tokenize(argv: string[]): Token[] {
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
			else if (nameIndex >= 2) {
				if (name)
					ArrayPush.call(acc, {
						kind: 'option',
						index,
						name,
						raw
					})
				else
					ArrayPush.call(acc, {
						kind: 'option-terminator',
						index
					})
			}
			index++
			return acc
		},
		[]
	) as Token[]
}

function extractName(arg: string) {
	var len = arg.length
	for (var i = 0; i < len; i++) {
		if (StringCharCodeAt.call(arg, i) !== 45) break
	}
	return [StringSlice.call(arg, i), i] as const
}
