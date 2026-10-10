import { type OptionToken, type PositionalToken, type Token, tokenizeArgs } from './tokenize_args.js'

export type ArgsValue = string | number | boolean
export type MultipleArgsValue = string[] | number[] | boolean[]

/**
 * The built-in value types an option can be declared with.
 */
export type OptionType = 'boolean' | 'number' | 'string'

type DeclarationOf<T extends OptionType, V> = {
	type: T
	/**
	 * Other names for this option, without dashes (e.g. `'n'` for `--name`).
	 * Parsed output always uses the declared (canonical) key.
	 */
	alias?: string | readonly string[]
} & (
	| {
			/**
			 * Repeat policy. `false` (the default) is last-wins.
			 */
			multiple?: false
			/**
			 * Value used when the option is absent.
			 */
			default?: V
	  }
	| {
			/**
			 * Collect every occurrence, in source order, into an array.
			 */
			multiple: true
			/**
			 * Values used when the option is absent.
			 */
			default?: readonly V[]
	  }
)

export type OptionDeclaration =
	| DeclarationOf<'boolean', boolean>
	| DeclarationOf<'number', number>
	| DeclarationOf<'string', string>

export type OptionDeclarations = Record<string, OptionDeclaration>

type BaseValue<T extends OptionType> = T extends 'boolean' ? boolean : T extends 'number' ? number : string

type ValueOf<D extends OptionDeclaration> = D extends { multiple: true } ? BaseValue<D['type']>[] : BaseValue<D['type']>

type DeclaredOptions<O extends OptionDeclarations> = {
	[K in keyof O as O[K] extends { default: unknown } ? K : never]: ValueOf<O[K]>
} & {
	[K in keyof O as O[K] extends { default: unknown } ? never : K]?: ValueOf<O[K]>
}

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
	 * Declared options have the type of their declaration (an array when `multiple`);
	 * a declared option with a `default` is always present.
	 * Undeclared options are `string | true`.
	 */
	options: DeclaredOptions<O> & Record<string, ArgsValue | MultipleArgsValue>
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
	const canonical = canonicalNames(declarations)
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
				const names = token.dashes === 1 ? Array.from(token.name) : [token.name]
				names.forEach((raw, i) => {
					const isLast = i === names.length - 1
					const name = canonical.get(raw) ?? raw
					const declaration = declarations?.[name]
					if (!isLast && declaration && declaration.type !== 'boolean') {
						throw new ParseArgsError(
							`Invalid option group '${token.raw}': '${raw}' takes a value, so it can only be the last option in a group`,
							name,
							token.raw
						)
					}
					const value = isLast ? (token.value ?? takeFollowingValue(declaration, remainingTokens)) : undefined
					const converted = convert(declaration, name, value, token)
					if (declaration?.multiple) (options[name] ??= []).push(converted)
					else options[name] = converted
				})
				break
			}
			case 'option-terminator': {
				__.push(...remainingTokens.map((token) => (token as PositionalToken).value))
				remainingTokens.length = 0
				break
			}
		}
	}
	for (const [name, declaration] of Object.entries(declarations ?? {})) {
		if (declaration.default !== undefined && options[name] === undefined) {
			options[name] = Array.isArray(declaration.default) ? [...declaration.default] : declaration.default
		}
	}
	const result: ParsedArgs<O> = { _, __, options }
	if (config.tokens) result.tokens = tokens
	return result
}

/**
 * Maps every declared name and alias to its canonical name.
 * Throws if two options claim the same name.
 */
function canonicalNames(declarations: OptionDeclarations | undefined) {
	const map = new Map<string, string>()
	if (!declarations) return map
	for (const name of Object.keys(declarations)) map.set(name, name)
	for (const [name, declaration] of Object.entries(declarations)) {
		const alias = declaration.alias
		for (const a of alias === undefined ? [] : Array.isArray(alias) ? alias : [alias]) {
			const owner = map.get(a)
			if (owner !== undefined && owner !== name) {
				throw new Error(`Alias '${a}' of option '${name}' is already used by option '${owner}'`)
			}
			map.set(a, name)
		}
	}
	return map
}

/**
 * A declared `number` or `string` option consumes the next token as its value
 * when it has no inline value.
 * The next token is taken only when it is a positional,
 * or (for `number`) an option-like token that is a valid number such as `-5`.
 * Otherwise nothing is consumed and conversion reports the missing value.
 */
function takeFollowingValue(option: OptionDeclaration | undefined, remaining: Token[]): string | undefined {
	if (!option || option.type === 'boolean') return undefined
	const next = remaining[0]
	if (!next) return undefined
	if (next.kind === 'positional') {
		remaining.shift()
		return next.value
	}
	if (next.kind === 'option' && option.type === 'number' && Number.isFinite(toNumber(next.raw))) {
		remaining.shift()
		return next.raw
	}
	return undefined
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
