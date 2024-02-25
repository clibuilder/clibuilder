import { ArrayPush, ArraySlice, StringCharCodeAt, StringSlice } from './_primordials.js'

export interface OptionToken {
	kind: 'option'
	index: number
	name: string
	dashes: number
	raw: string
	value?: string
}

export interface OptionTerminatorToken {
	kind: 'option-terminator'
	index: number
}

export interface PositionalToken {
	kind: 'positional'
	index: number
	value: string
}
export type Token = OptionToken | OptionTerminatorToken | PositionalToken

export function tokenize(args: string[]): Token[] {
	const tokens: Token[] = []
	var index = 0

	const remainingArgs = ArraySlice.call(args)
	while (remainingArgs.length > 0) {
		var raw = remainingArgs.shift()
		if (raw === '--') {
			ArrayPush.call(tokens, {
				kind: 'option-terminator',
				index
			})
			index++
			ArrayPush.apply(
				tokens,
				remainingArgs.map((value, i) => ({
					kind: 'positional',
					index: index + i,
					value
				}))
			)
			break
		}

		var [name, dashes] = extractName(raw)
		if (dashes === 0 || !name)
			ArrayPush.call(tokens, {
				kind: 'positional',
				index,
				value: name || raw
			})
		else {
			const [n, value] = name.split('=', 2)
			ArrayPush.call(tokens, {
				kind: 'option',
				index,
				name: n,
				dashes,
				raw,
				value
			})
		}

		index++
	}
	return tokens
}

const DASH_CHAR_CODE = 45

function extractName(arg: string) {
	var len = arg.length
	for (var i = 0; i < len; i++) {
		if (StringCharCodeAt.call(arg, i) !== DASH_CHAR_CODE) break
	}
	return [StringSlice.call(arg, i), i] as const
}
