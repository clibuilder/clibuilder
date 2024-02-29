import { trimDashes } from './_trim_dashes.js'
import { tokenizeArgs, type PositionalToken } from './tokenize_args.js'

export type ArgsValue = string | boolean | string[] | boolean[]

export function argsStrictParser() {
	// const spec = specBuilder()
	const options = new Set<{ name: string; dashes: number }>()
	return {
		option(key: string) {
			const [name, dashes] = trimDashes(key)
			if (dashes === 0 || !name) throw new Error(`Option must starts with one or more dashes ('-'), received '${key}'.`)
			options.add({ name, dashes })
			return this
		},
		/**
		 * parse command line input: `process.argv.slice(2)`.
		 */
		parse(argv: string[]) {
			const tokens = tokenizeArgs(argv)
			const result = {
				_: [],
				__: []
			} as Record<string, ArgsValue> & { _: string[]; __: string[] }
			const remainingTokens = tokens.slice()
			while (remainingTokens.length > 0) {
				const token = remainingTokens.shift()!
				switch (token.kind) {
					case 'positional': {
						result._.push(token.value)
						break
					}
					case 'option-terminator': {
						result.__.push(...remainingTokens.map((token) => (token as PositionalToken).value))
						break
					}
					case 'option': {
						options.has({ name: token.name, dashes: token.dashes })
						result[token.name] = token.value ?? true
					}
				}
			}
			return result
		}
	}
}

// export function specBuilder() {
// 	const options = new Map()
// 	return {
// 		option(key: string) {
// 			const [name, dashes] = trimDashes(key)
// 		}
// 	}
// }
