import type { StandardSchemaV1 } from './standard_schema.js'
import { type AnyDescriptor, type Data, isDescriptor, type OutputOf } from './t.js'
import { type Grammar, type OptionToken, type PositionalToken, type Token, tokenizeArgs } from './tokenize_args.js'

export type ArgsValue = string | number | boolean
export type MultipleArgsValue = string[] | number[] | boolean[]

/**
 * The built-in value types an option can be declared with by name.
 * A descriptor from `t` can be used instead.
 */
export type OptionType = 'boolean' | 'number' | 'string'

type Alias = {
	/**
	 * Other names for this option, without dashes (e.g. `'n'` for `--name`).
	 * Parsed output always uses the declared (canonical) key.
	 */
	alias?: string | readonly string[]
}

type DeclarationOf<T extends OptionType, V> = {
	type: T
} & Alias &
	(
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

/**
 * The value a `default` is written as: an array default may be a readonly array.
 */
export type DefaultOf<Out> = Out extends readonly (infer E)[] ? readonly E[] : Out

/**
 * An option declared with a descriptor from `t`.
 */
export type DescriptorDeclaration<D extends AnyDescriptor = AnyDescriptor> = {
	type: D
	/**
	 * Value used when the option is absent. It is not converted; the descriptor's checks run on it.
	 * An option with a `default` is always present in the output.
	 */
	default?: DefaultOf<OutputOf<D>>
	/**
	 * Not supported with a descriptor: use `t.array(element)` to collect every occurrence.
	 */
	multiple?: never
} & Alias

export type OptionDeclaration =
	| DeclarationOf<'boolean', boolean>
	| DeclarationOf<'number', number>
	| DeclarationOf<'string', string>
	| DescriptorDeclaration

export type OptionDeclarations = Record<string, OptionDeclaration>

type BaseValue<T extends OptionType> = T extends 'boolean' ? boolean : T extends 'number' ? number : string

type ValueOf<D extends OptionDeclaration> = D extends { type: infer T extends AnyDescriptor }
	? // the unknown descriptor of the default `OptionDeclarations`
		0 extends 1 & OutputOf<T>
		? unknown
		: OutputOf<T>
	: D extends { type: infer T extends OptionType }
		? D extends { multiple: true }
			? BaseValue<T>[]
			: BaseValue<T>
		: never

type IsPresent<D> = D extends { default: unknown } ? true : D extends { type: { isOptional: false } } ? true : false

type DeclaredOptions<O extends OptionDeclarations> = {
	-readonly [K in keyof O as IsPresent<O[K]> extends true ? K : never]: ValueOf<O[K]>
} & {
	-readonly [K in keyof O as IsPresent<O[K]> extends true ? never : K]?: ValueOf<O[K]>
}

/**
 * Checks that each descriptor option's `default` has the descriptor's type.
 */
export type CheckDefaults<O> = {
	[K in keyof O]: O[K] extends { type: infer D extends AnyDescriptor } ? { default?: DefaultOf<OutputOf<D>> } : unknown
}

/**
 * Which way an input was wrong.
 *
 * - `unknown-option`: an undeclared option under `strict`.
 * - `unexpected-positional`: a positional when `allowPositionals` is `false`.
 * - `invalid-group`: an option that takes a value is not last in a short group.
 * - `missing-value`: an option that takes a value was given none.
 * - `invalid-value`: a value failed conversion, a constraint, or a check.
 * - `missing-option`: a required descriptor option was absent.
 */
export type ParseArgsErrorKind =
	| 'unknown-option'
	| 'unexpected-positional'
	| 'invalid-group'
	| 'missing-value'
	| 'invalid-value'
	| 'missing-option'

/**
 * Thrown when the input does not fit the declarations: a usage error the caller can fix.
 */
export class ParseArgsError extends Error {
	/**
	 * Which way the input was wrong.
	 */
	public readonly kind: ParseArgsErrorKind
	/**
	 * For an array option, the index of the element that failed.
	 */
	public readonly index: number | undefined
	/**
	 * The issues reported by a Standard Schema, when one failed.
	 * The message never repeats their text.
	 */
	public readonly issues: readonly StandardSchemaV1.Issue[] | undefined
	/**
	 * The raw value that failed, as typed. `undefined` when no value was given.
	 */
	public readonly value: string | undefined
	/**
	 * What was wrong, without the option and input framing of `message`:
	 * what the descriptor expected, a check's own message, or a converter's error message.
	 */
	public readonly detail: string

	constructor(
		message: string,
		/**
		 * The option name as declared (or as given, for an unknown option).
		 * `undefined` for an unexpected positional.
		 */
		public readonly option: string | undefined,
		/**
		 * The input form that caused the error, e.g. `--count=abc`, or the positional value.
		 * Empty for a missing option.
		 */
		public readonly input: string,
		details: {
			kind?: ParseArgsErrorKind | undefined
			index?: number | undefined
			issues?: readonly StandardSchemaV1.Issue[] | undefined
			value?: string | undefined
			detail?: string | undefined
		} = {}
	) {
		super(message)
		this.name = 'ParseArgsError'
		this.kind = details.kind ?? 'invalid-value'
		this.index = details.index
		this.issues = details.issues
		this.value = details.value
		this.detail = details.detail ?? message
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
	 * a declared option with a `default`, or a descriptor option that is not `.optional()`, is always present.
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
	options?: O & CheckDefaults<O>
	/**
	 * Report undeclared options as a `ParseArgsError` instead of accepting them.
	 * Names and aliases are both checked, including each option in a short group.
	 * **Default: `false`** (permissive: unknown options are kept in `options`).
	 */
	strict?: boolean
	/**
	 * Accept positional arguments, before and after the terminator.
	 * When `false`, a positional throws a `ParseArgsError`.
	 * Independent of `strict`. A value consumed by an option is not a positional.
	 * **Default: `true`.**
	 */
	allowPositionals?: boolean
	/**
	 * Option modifiers and terminator, as accepted by `tokenizeArgs`.
	 * One modifier character starts a short group, two or more start a long option,
	 * whatever the characters are; `ParsedArgs.tokens` holds the raw source text.
	 * **Default: `{ modifiers: '-', terminator: '--' }`.**
	 */
	grammar?: Grammar
	/**
	 * Return the parsed tokens.
	 * **Default: `false`.**
	 */
	tokens?: boolean
}

/**
 * Parse command line input into options and positional arguments.
 *
 * Synchronous: if a converter or check returns a promise, it throws an `Error`
 * asking for `parseArgsAsync()`.
 */
export function parseArgs<const O extends OptionDeclarations = OptionDeclarations>(
	config: ParseArgsConfig<O>
): ParsedArgs<O> {
	const steps = parse(config)
	let next = steps.next()
	while (!next.done) {
		const { value, option } = next.value
		if (isThenable(value)) {
			value.then(undefined, () => {})
			steps.return(undefined as never)
			throw new Error(`Option '${option}' has an asynchronous converter or check: use parseArgsAsync() to parse it`)
		}
		next = steps.next(value)
	}
	return next.value as ParsedArgs<O>
}

/**
 * Parse command line input into options and positional arguments,
 * awaiting asynchronous converters and checks one at a time, in order.
 */
export async function parseArgsAsync<const O extends OptionDeclarations = OptionDeclarations>(
	config: ParseArgsConfig<O>
): Promise<ParsedArgs<O>> {
	const steps = parse(config)
	let next = steps.next()
	while (!next.done) {
		next = await Promise.resolve(next.value.value).then(
			(value) => steps.next(value),
			(error: unknown) => steps.throw(error)
		)
	}
	return next.value as ParsedArgs<O>
}

/**
 * A value that may be a promise, yielded by `parse()` for the driver to resolve.
 */
type Step = { value: unknown; option: string }

type Steps<R> = Generator<Step, R, unknown>

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		(typeof value === 'object' || typeof value === 'function') &&
		value !== null &&
		typeof (value as PromiseLike<unknown>).then === 'function'
	)
}

function* parse(config: ParseArgsConfig): Steps<ParsedArgs> {
	const tokens = tokenizeArgs(config.args, config.grammar)
	const declarations: OptionDeclarations | undefined = config.options
	checkDeclarations(declarations)
	const canonical = canonicalNames(declarations)
	const options = Object.create(null)
	const sources: Record<string, string[]> = Object.create(null)
	const _: string[] = []
	const __: string[] = []

	const remainingTokens = tokens.slice()
	while (remainingTokens.length > 0) {
		const token = remainingTokens.shift()!
		switch (token.kind) {
			case 'positional': {
				checkPositional(config, token.value)
				_.push(token.value)
				break
			}
			case 'option': {
				const names = token.dashes === 1 ? Array.from(token.name) : [token.name]
				for (let i = 0; i < names.length; i++) {
					const raw = names[i]!
					const isLast = i === names.length - 1
					const name = canonical.get(raw) ?? raw
					const declaration = declarations?.[name]
					if (config.strict && !declaration) {
						throw new ParseArgsError(`Unknown option '${raw}' (from '${token.raw}')`, raw, token.raw, {
							kind: 'unknown-option'
						})
					}
					if (!isLast && declaration && takesValue(declaration)) {
						throw new ParseArgsError(
							`Invalid option group '${token.raw}': '${raw}' takes a value, so it can only be the last option in a group`,
							name,
							token.raw,
							{ kind: 'invalid-group', detail: 'takes a value, so it can only be the last option in a group' }
						)
					}
					const value = isLast ? (token.value ?? takeFollowingValue(declaration, remainingTokens)) : undefined
					if (declaration && isDescriptor(declaration.type)) {
						const d = declaration.type
						if (d.kind === 'array') {
							const list: unknown[] = (options[name] ??= [])
							;(sources[name] ??= []).push(token.raw)
							const at = { name, label: `${name}[${list.length}]`, index: list.length, token }
							list.push(yield* convertAndCheck(d.element, value, at))
						} else {
							options[name] = yield* convertAndCheck(d, value, { name, label: name, index: undefined, token })
						}
						continue
					}
					const converted = convert(declaration, name, value, token)
					if (declaration?.multiple) (options[name] ??= []).push(converted)
					else options[name] = converted
				}
				break
			}
			case 'option-terminator': {
				for (const rest of remainingTokens) checkPositional(config, (rest as PositionalToken).value)
				__.push(...remainingTokens.map((token) => (token as PositionalToken).value))
				remainingTokens.length = 0
				break
			}
		}
	}
	for (const [name, declaration] of Object.entries(declarations ?? {})) {
		const descriptor = isDescriptor(declaration.type) ? declaration.type : undefined
		if (options[name] !== undefined) {
			if (descriptor?.kind === 'array') {
				const input = sources[name]!.join(' ')
				yield* runChecks(descriptor, options[name], name, (detail, issues) =>
					usageError(name, name, input, detail, { issues })
				)
			}
			continue
		}
		if (declaration.default !== undefined) {
			if (descriptor) yield* checkDefault(declaration as DescriptorDeclaration, name)
			options[name] = Array.isArray(declaration.default) ? [...declaration.default] : declaration.default
		} else if (descriptor && !descriptor.isOptional) {
			throw new ParseArgsError(`Missing required option '${name}'`, name, '', {
				kind: 'missing-option',
				detail: 'a value is required'
			})
		}
	}
	const result: ParsedArgs = { _, __, options }
	if (config.tokens) result.tokens = tokens
	return result
}

function checkDeclarations(declarations: OptionDeclarations | undefined) {
	for (const [name, declaration] of Object.entries(declarations ?? {})) {
		const type: unknown = declaration.type
		if (typeof type === 'object' && type !== null && !isDescriptor(type)) {
			throw new TypeError(`Option '${name}' has a type that is neither a type name nor a descriptor from t`)
		}
		if (isDescriptor(type) && declaration.multiple !== undefined) {
			throw new TypeError(`Option '${name}' cannot set 'multiple' with a descriptor: use t.array(element)`)
		}
	}
}

/**
 * Throws if positionals are not allowed.
 */
function checkPositional(config: { allowPositionals?: boolean | undefined }, value: string) {
	if (config.allowPositionals === false) {
		throw new ParseArgsError(`Unexpected positional argument '${value}'`, undefined, value, {
			kind: 'unexpected-positional'
		})
	}
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

function elementOf(data: Data) {
	return data.kind === 'array' ? data.element : data
}

function takesValue(declaration: OptionDeclaration) {
	if (!isDescriptor(declaration.type)) return declaration.type !== 'boolean'
	const data = elementOf(declaration.type)
	return !(data.kind === 'boolean' || (data.kind === 'literal' && typeof data.value === 'boolean'))
}

function isNumeric(declaration: OptionDeclaration) {
	if (!isDescriptor(declaration.type)) return declaration.type === 'number'
	const data = elementOf(declaration.type)
	return data.kind === 'number' || data.kind === 'int' || (data.kind === 'literal' && typeof data.value === 'number')
}

/**
 * A declared option that takes a value consumes the next token as its value
 * when it has no inline value.
 * The next token is taken only when it is a positional,
 * or (for a numeric option) an option-like token that is a valid number such as `-5`.
 * Otherwise nothing is consumed and conversion reports the missing value.
 */
function takeFollowingValue(option: OptionDeclaration | undefined, remaining: Token[]): string | undefined {
	if (!option || !takesValue(option)) return undefined
	const next = remaining[0]
	if (!next) return undefined
	if (next.kind === 'positional') {
		remaining.shift()
		return next.value
	}
	if (next.kind === 'option' && isNumeric(option) && Number.isFinite(toNumber(next.raw))) {
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
			if (value === undefined) throw invalid(name, 'a value is required', token, 'missing-value')
			return value
	}
}

function invalid(name: string, detail: string, token: OptionToken, kind: ParseArgsErrorKind, value?: string) {
	return new ParseArgsError(`Invalid value for option '${name}': ${detail} (from '${token.raw}')`, name, token.raw, {
		kind,
		value,
		detail
	})
}

function toNumber(value: string) {
	return value.trim() === '' ? Number.NaN : Number(value)
}

function convertNumber(name: string, value: string | undefined, token: OptionToken) {
	if (value === undefined) throw invalid(name, 'a number is required', token, 'missing-value')
	const num = toNumber(value)
	if (!Number.isFinite(num)) throw invalid(name, value, token, 'invalid-value', value)
	return num
}

function convertBoolean(name: string, value: string | undefined, token: OptionToken) {
	if (value === undefined) return true
	if (value === 'false' || value === 'f' || value === '0') return false
	if (value === 'true' || value === 't') return true
	const num = toNumber(value)
	if (!Number.isNaN(num)) return num > 0
	throw invalid(name, value, token, 'invalid-value', value)
}

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

/**
 * Where a descriptor value came from.
 * `label` names an array element as `name[index]`.
 */
type Site = { name: string; label: string; index: number | undefined; token: OptionToken }

/**
 * Builds the usage error for a failed value.
 * `text` is what the message says when it differs from `detail`, such as the value it got.
 */
type Fail = (detail: string, issues?: readonly StandardSchemaV1.Issue[], text?: string) => Error

function usageError(
	name: string,
	label: string,
	input: string,
	detail: string,
	details: {
		kind?: ParseArgsErrorKind
		index?: number | undefined
		issues?: readonly StandardSchemaV1.Issue[] | undefined
		value?: string | undefined
	},
	text = detail
) {
	return new ParseArgsError(`Invalid value for option '${label}': ${text} (from '${input}')`, name, input, {
		...details,
		detail
	})
}

function* convertAndCheck(data: Data, raw: string | undefined, site: Site): Steps<unknown> {
	const fail: Fail = (detail, issues, text) =>
		usageError(site.name, site.label, site.token.raw, detail, { index: site.index, issues, value: raw }, text)
	const value = yield* convertDescriptor(data, raw, site, fail)
	yield* runChecks(data, value, site.label, fail)
	return value
}

function quote(raw: string) {
	return `'${raw}'`
}

/**
 * Describes what a descriptor expects, for error messages.
 */
function describeExpected(data: Exclude<Data, { kind: 'array' | 'custom' | 'json' }>): string {
	switch (data.kind) {
		case 'string':
			// only a pattern can reject a string
			return `a string matching ${data.pattern}`
		case 'number':
		case 'int': {
			const noun = data.kind === 'int' ? 'an integer' : 'a number'
			if (data.min !== undefined && data.max !== undefined) return `${noun} from ${data.min} to ${data.max}`
			if (data.min !== undefined) return `${noun} of at least ${data.min}`
			if (data.max !== undefined) return `${noun} of at most ${data.max}`
			return noun
		}
		case 'boolean':
			return 'no value, true or false'
		case 'literal':
			return typeof data.value === 'string' ? quote(data.value) : String(data.value)
		case 'enum':
			return `one of ${data.values.map(quote).join(', ')}`
	}
}

function* convertDescriptor(data: Data, raw: string | undefined, site: Site, fail: Fail): Steps<unknown> {
	const expected = (data: Parameters<typeof describeExpected>[0]) =>
		fail(`expected ${describeExpected(data)}`, undefined, `expected ${describeExpected(data)}, got ${quote(raw!)}`)
	if (data.kind === 'boolean' || (data.kind === 'literal' && typeof data.value === 'boolean')) {
		const value = raw === undefined || raw === 'true' ? true : raw === 'false' ? false : undefined
		if (value === undefined || (data.kind === 'literal' && value !== data.value)) {
			throw raw === undefined
				? fail(`expected ${describeExpected(data)}`, undefined, `expected ${describeExpected(data)}, got no value`)
				: expected(data)
		}
		return value
	}
	if (raw === undefined) {
		throw usageError(site.name, site.label, site.token.raw, 'a value is required', {
			kind: 'missing-value',
			index: site.index
		})
	}
	switch (data.kind) {
		case 'string':
			if (data.pattern) {
				data.pattern.lastIndex = 0
				if (!data.pattern.test(raw)) throw expected(data)
			}
			return raw
		case 'number':
		case 'int': {
			const num = toNumber(raw)
			if (!Number.isFinite(num) || (data.kind === 'int' && !Number.isInteger(num))) throw expected(data)
			if ((data.min !== undefined && num < data.min) || (data.max !== undefined && num > data.max)) throw expected(data)
			return num
		}
		case 'literal': {
			const value = typeof data.value === 'number' ? toNumber(raw) : raw
			if (value !== data.value) throw expected(data)
			return value
		}
		case 'enum':
			if (!data.values.includes(raw)) throw expected(data)
			return raw
		case 'custom':
			try {
				return yield { value: data.convert(raw), option: site.label }
			} catch (error) {
				throw usageFailure(error, fail)
			}
		case 'json': {
			let value: unknown
			try {
				value = JSON.parse(raw)
			} catch {
				throw fail('not valid JSON', undefined, `${quote(raw)} is not valid JSON`)
			}
			if (!data.schema) return value
			const result = (yield {
				value: data.schema['~standard'].validate(value),
				option: site.label
			}) as StandardSchemaV1.Result<unknown>
			if (result.issues) throw fail('does not match the expected shape', result.issues)
			return result.value
		}
	}
}

/**
 * A plain `Error` (whose constructor is `Error` itself) from a converter is a usage error.
 * Anything else is a runtime error and propagates.
 */
function usageFailure(error: unknown, fail: Fail) {
	if (error instanceof Error && error.constructor === Error) return fail(error.message)
	return error
}

/**
 * Runs the descriptor's checks in declaration order. The first failing check wins.
 */
function* runChecks(data: Data, value: unknown, label: string, fail: Fail): Steps<void> {
	for (const check of data.checks) {
		if (check.type === 'fn') {
			const result = yield { value: check.fn(value), option: label }
			if (result === false) throw fail('failed a check')
			if (typeof result === 'string') throw fail(result)
		} else {
			const result = (yield {
				value: check.schema['~standard'].validate(value),
				option: label
			}) as StandardSchemaV1.Result<unknown>
			if (result.issues) throw fail('failed a check', result.issues)
		}
	}
}

const checkedDefaults = new WeakMap<object, true>()

/**
 * Runs the checks of a descriptor option's `default` once, at the first parse that uses its declaration.
 * A failure is a programmer error, not a usage error.
 */
function* checkDefault(declaration: DescriptorDeclaration, name: string): Steps<void> {
	if (checkedDefaults.has(declaration)) return
	const d = declaration.type
	const failFor =
		(label: string): Fail =>
		(detail) =>
			new Error(`The default of option '${label}' failed a check${detail === 'failed a check' ? '' : `: ${detail}`}`)
	if (d.kind === 'array') {
		const values = declaration.default as readonly unknown[]
		for (let i = 0; i < values.length; i++) {
			const label = `${name}[${i}]`
			yield* runChecks(d.element, values[i], label, failFor(label))
		}
	}
	yield* runChecks(d, declaration.default, name, failFor(name))
	checkedDefaults.set(declaration, true)
}
