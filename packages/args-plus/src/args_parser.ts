import { tokenize, type PositionalToken } from './tokenize.js'

export type ArgsValue = string | boolean | string[] | boolean[]
export type ParsedArgs<T extends Record<string, ArgsValue> = Record<string, ArgsValue>> = T & {
	_: string[]
	__: string[]
}

export function argsParser() {
	return {
		/**
		 * parse command line input: `process.argv.slice(2)`.
		 */
		parse(argv: string[]) {
			const tokens = tokenize(argv)
			const result: ParsedArgs = {
				_: [],
				__: []
			}
			const remainingTokens = tokens.slice()
			while (remainingTokens.length > 0) {
				const token = remainingTokens.shift()!
				switch (token.kind) {
					case 'positional': {
						result._.push(token.value)
						break
					}
					case 'option': {
						if (token.dashes === 1) {
							Array.from(token.name).forEach(
								(k, i) => (result[k] = i === token.name.length - 1 ? token.value ?? true : true)
							)
						} else {
							result[token.name] = token.value ?? true
						}
						break
					}
					case 'option-terminator': {
						result.__.push(...remainingTokens.map((token) => (token as PositionalToken).value))
						return result
					}
				}
			}
			return result
		}
	}
}
