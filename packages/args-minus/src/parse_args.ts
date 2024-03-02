import { tokenizeArgs, type PositionalToken, type Token } from './tokenize_args.js'

export type ArgsValue = string | boolean
export type MultipleArgsValue = string[] | boolean[]

export type ParsedArgs = {
	/**
	 * Positional arguments.
	 */
	_: string[]
	/**
	 * Positional arguments after `--`.
	 */
	__: string[]
	/**
	 * Parsed options.
	 */
	options: Record<string, ArgsValue>
	/**
	 * Parsed tokens. Only returned if `config` includes `tokens: true`.
	 */
	tokens?: Token[] | undefined
}

export type ParseArgsConfig = {
	/**
	 * Array of argument strings.
	 * This should be `process.argv.slice(2)`.
	 * i.e. with `execPath` and `filename` removed.
	 */
	args: string[]
	options?: Record<string, { type: 'boolean' | 'number' | 'string' }>
	/**
	 * Return the parsed tokens.
	 * **Default: `false`.**
	 */
	tokens?: boolean
}

/**
 * Parse command line input into options and positional arguments.
 */
export function parseArgs(config: ParseArgsConfig): ParsedArgs {
	const tokens = tokenizeArgs(config.args)
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
					options[token.name] = parseValue(config.options?.[token.name], token.name, token.value)
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

function parseValue(
	option: { type: 'boolean' | 'number' | 'string' } | undefined,
	name: string,
	value: string | undefined
) {
	if (!option) return value ?? true
	if (option.type === 'boolean') {
		return convertBoolean(name, value)
	}
	if (option.type === 'number') {
		return Number(value)
	}
	return value
}

function convertBoolean(name: string, value: string | undefined) {
	if (value === undefined) return true
	if (value === 'false' || value === 'f' || value === '0') return false
	if (value === 'true' || value === 't') return true
	const num = Number(value)
	if (!Number.isNaN(num)) return num > 0
	throw new Error(`Invalid value for option '${name}': ${value}`)
}
