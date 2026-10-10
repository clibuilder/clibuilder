import { type OptionToken, type PositionalToken, type Token, tokenizeArgs } from './tokenize_args.js'

export type ArgsValue = string | number | boolean
export type MultipleArgsValue = string[] | number[] | boolean[]

/**
 * The built-in value types an option can be declared with.
 */
export type OptionType = 'boolean' | 'number' | 'string'

export type OptionDeclaration = { type: OptionType }

export type OptionDeclarations = Record<string, OptionDeclaration>

type ValueOf<T extends OptionType> = T extends 'boolean' ? boolean : T extends 'number' ? number : string

/**
 * Thrown when a declared option receives a value it cannot convert.
 */
export class ParseArgsError extends Error {
	constructor(
		message: string,
		/**
		 * The option name as declared.
		 */
		public readonly option: string,
		/**
		 * The input form that caused the error, e.g. `--count=abc`.
		 */
		public readonly input: string
	) {
		super(message)
		this.name = 'ParseArgsError'
	}
}

export type ParsedArgs<O extends OptionDeclarations = OptionDeclarations> = {
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
	 * Declared options have the type of their declaration;
	 * undeclared options are `string | true`.
	 */
	options: { [K in keyof O]?: ValueOf<O[K]['type']> } & Record<string, ArgsValue>
	/**
	 * Parsed tokens. Only returned if `config` includes `tokens: true`.
	 */
	tokens?: Token[] | undefined
}

export type ParseArgsConfig<O extends OptionDeclarations = OptionDeclarations> = {
	/**
	 * Array of argument strings.
	 * This should be `process.argv.slice(2)`.
	 * i.e. with `execPath` and `filename` removed.
	 */
	args: string[]
	/**
	 * Option declarations, keyed by option name.
	 */
	options?: O
	/**
	 * Return the parsed tokens.
	 * **Default: `false`.**
	 */
	tokens?: boolean
}

/**
 * Parse command line input into options and positional arguments.
 */
export function parseArgs<const O extends OptionDeclarations = OptionDeclarations>(
	config: ParseArgsConfig<O>
): ParsedArgs<O> {
	const tokens = tokenizeArgs(config.args)
	const declarations: OptionDeclarations | undefined = config.options
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
					const names = Array.from(token.name)
					names.forEach((k, i) => {
						options[k] = convert(declarations?.[k], k, i === names.length - 1 ? token.value : undefined, token)
					})
				} else {
					options[token.name] = convert(declarations?.[token.name], token.name, token.value, token)
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
	const result: ParsedArgs<O> = { _, __, options }
	if (config.tokens) result.tokens = tokens
	return result
}

function convert(
	option: OptionDeclaration | undefined,
	name: string,
	value: string | undefined,
	token: OptionToken
): ArgsValue {
	if (!option) return value ?? true
	switch (option.type) {
		case 'boolean':
			return convertBoolean(name, value, token)
		case 'number':
			return convertNumber(name, value, token)
		default:
			if (value === undefined) throw invalid(name, 'a value is required', token)
			return value
	}
}

function invalid(name: string, detail: string, token: OptionToken) {
	return new ParseArgsError(`Invalid value for option '${name}': ${detail} (from '${token.raw}')`, name, token.raw)
}

function toNumber(value: string) {
	return value.trim() === '' ? Number.NaN : Number(value)
}

function convertNumber(name: string, value: string | undefined, token: OptionToken) {
	if (value === undefined) throw invalid(name, 'a number is required', token)
	const num = toNumber(value)
	if (!Number.isFinite(num)) throw invalid(name, value, token)
	return num
}

function convertBoolean(name: string, value: string | undefined, token: OptionToken) {
	if (value === undefined) return true
	if (value === 'false' || value === 'f' || value === '0') return false
	if (value === 'true' || value === 't') return true
	const num = toNumber(value)
	if (!Number.isNaN(num)) return num > 0
	throw invalid(name, value, token)
}
