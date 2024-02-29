import { tokenize, type PositionalToken, type Token } from './tokenize.js'

export type ArgsValue = string | boolean | string[] | boolean[]

export type ParsedArgs = {
	_: string[]
	__: string[]
	options: Record<string, ArgsValue>
	tokens?: Token[]
}

/**
 * Parse command line input: `process.argv.slice(2)`.
 */
export function parseArgs(config: { args: string[]; tokens?: boolean }): ParsedArgs {
	const tokens = tokenize(config.args)
	const options = Object.create(null)
	const _: string[] = []
	const __: string[] = []

	const remainingTokens = tokens.slice()
	while (remainingTokens.length > 0) {
		const token = remainingTokens.shift()!
		switch (token.kind) {
			case 'positional': {
				_.push(token.value)
				break
			}
			case 'option': {
				if (token.dashes === 1) {
					Array.from(token.name).forEach(
						(k, i) => (options[k] = i === token.name.length - 1 ? token.value ?? true : true)
					)
				} else {
					options[token.name] = token.value ?? true
				}
				break
			}
			case 'option-terminator': {
				__.push(...remainingTokens.map((token) => (token as PositionalToken).value))
				remainingTokens.length = 0
				break
			}
		}
	}
	const result: ParsedArgs = { _, __, options }
	if (config.tokens) result.tokens = tokens
	return result
}
