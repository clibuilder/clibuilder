import type { StandardSchemaV1 } from './standard_schema.js'

/**
 * The scalar values `t.literal` accepts.
 */
export type Scalar = string | number | boolean

export type StringData = { readonly kind: 'string'; readonly pattern?: RegExp }
export type NumberData = { readonly kind: 'number'; readonly min?: number; readonly max?: number }
export type IntData = { readonly kind: 'int'; readonly min?: number; readonly max?: number }
export type BooleanData = { readonly kind: 'boolean' }
export type LiteralData = { readonly kind: 'literal'; readonly value: Scalar }
export type EnumData = { readonly kind: 'enum'; readonly values: readonly [string, ...string[]] }
export type ArrayData = { readonly kind: 'array'; readonly element: Data }
export type CustomData = { readonly kind: 'custom'; readonly convert: (raw: string) => unknown }
export type JsonData = { readonly kind: 'json'; readonly schema?: StandardSchemaV1 }

/**
 * A recorded `.check()`, in declaration order.
 */
export type Check =
	| { readonly type: 'fn'; readonly fn: CheckFn<any> }
	| { readonly type: 'schema'; readonly schema: StandardSchemaV1 }

/**
 * The fields every descriptor has, whatever its kind.
 */
export type DataCommon = { readonly isOptional: boolean; readonly checks: readonly Check[] }

/**
 * The data of a descriptor that can be an array element: every kind but `array`.
 */
export type ElementData = (
	| StringData
	| NumberData
	| IntData
	| BooleanData
	| LiteralData
	| EnumData
	| CustomData
	| JsonData
) &
	DataCommon

/**
 * The public, read-only introspection form of a descriptor, keyed on `kind`.
 * Help, usage errors and other tools read this instead of the descriptor's internals.
 */
export type Data = ElementData | (ArrayData & DataCommon)

export type Kind = Data['kind']

/**
 * A `.check()` function.
 * It passes by returning `true` or nothing,
 * fails with a generic message by returning `false`,
 * or fails with its own message by returning a string.
 * It may return a promise of any of these.
 */
export type CheckFn<Out> = (
	value: Out
	// biome-ignore lint/suspicious/noConfusingVoidType: a check that returns nothing passes
) => boolean | string | void | Promise<boolean | string | void>

/**
 * Accepts a schema whose input is wider or narrower than the option value,
 * and rejects one whose input is unrelated to it with a readable error.
 */
export type CheckCompatible<Out, S extends StandardSchemaV1> = [Out] extends [StandardSchemaV1.InferInput<S>]
	? unknown
	: [StandardSchemaV1.InferInput<S>] extends [Out]
		? unknown
		: { readonly '~check': ['schema input', StandardSchemaV1.InferInput<S>, 'is unrelated to option value', Out] }

declare const output: unique symbol

/**
 * An option type: converts the raw argv string into `Out`.
 * Its own enumerable fields are its `Data`.
 *
 * @typeParam Out the converted value type.
 * @typeParam Opt whether the option may be absent.
 * @typeParam D the descriptor's data.
 */
export type Descriptor<Out = unknown, Opt extends boolean = boolean, D extends Data = Data> = D & {
	readonly isOptional: Opt
	/**
	 * Type-only: the converted value type. It does not exist at runtime.
	 */
	readonly [output]: Out
	/**
	 * Lets the option be absent.
	 */
	optional(): Descriptor<Out, true, D>
	/**
	 * Validates the converted value with any Standard Schema.
	 * The schema's output is ignored: a check never changes the value or its type.
	 */
	check<S extends StandardSchemaV1>(schema: S & CheckCompatible<Out, S>): Descriptor<Out, Opt, D>
	/**
	 * Validates the converted value with a function.
	 */
	check(fn: CheckFn<Out>): Descriptor<Out, Opt, D>
}

export type AnyDescriptor = Descriptor<any, boolean, Data>

/**
 * A descriptor `t.array` accepts as its element: not optional, not an array.
 */
export type ElementDescriptor = Descriptor<any, false, ElementData>

/**
 * The value type a descriptor converts to.
 */
export type OutputOf<D> = D extends { readonly [output]: infer Out } ? Out : never

export type StringOptions = { readonly pattern?: RegExp }
export type NumberOptions = { readonly min?: number; readonly max?: number }

// a `Symbol.for` key, so a descriptor from another copy of args-minus in the same process is recognized;
// its value is the descriptor format version, raised only when the data shape changes incompatibly
const descriptorBrand: unique symbol = Symbol.for('args-minus.descriptor') as any
const descriptorVersion = 1

const methods = {
	[descriptorBrand]: descriptorVersion,
	optional(this: Data) {
		return create({ ...this, isOptional: true })
	},
	check(this: Data, check: CheckFn<unknown> | StandardSchemaV1) {
		const entry: Check = typeof check === 'function' ? { type: 'fn', fn: check } : { type: 'schema', schema: check }
		if (typeof check !== 'function' && !isStandardSchema(check)) {
			throw new TypeError('check() takes a function or a Standard Schema')
		}
		return create({ ...this, checks: [...this.checks, entry] })
	}
}

function create(data: Data): AnyDescriptor {
	return Object.freeze(Object.assign(Object.create(methods), data))
}

function make<Out, D extends Data>(data: Omit<D, keyof DataCommon>): Descriptor<Out, false, D> {
	return create({ ...data, isOptional: false, checks: Object.freeze([]) } as unknown as Data) as never
}

function isStandardSchema(value: unknown): value is StandardSchemaV1 {
	const props = (value as StandardSchemaV1 | undefined)?.['~standard']
	return typeof props === 'object' && props !== null && typeof props.validate === 'function'
}

function checkBounds(builder: string, options: NumberOptions | undefined, integer: boolean) {
	const { min, max } = options ?? {}
	for (const [name, bound] of [
		['min', min],
		['max', max]
	] as const) {
		if (bound === undefined) continue
		if (typeof bound !== 'number' || Number.isNaN(bound)) throw new TypeError(`${builder}: ${name} must be a number`)
		if (integer && Number.isFinite(bound) && !Number.isInteger(bound)) {
			throw new RangeError(`${builder}: ${name} must be an integer, got ${bound}`)
		}
	}
	if (min !== undefined && max !== undefined && min > max) {
		throw new RangeError(`${builder}: min (${min}) is greater than max (${max})`)
	}
	return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) }
}

function string(options?: StringOptions): Descriptor<string, false, StringData & DataCommon>
function string<T extends string>(
	options: StringOptions & { readonly pattern: RegExp }
): Descriptor<T, false, StringData & DataCommon>
function string(options?: StringOptions) {
	const pattern = options?.pattern
	if (pattern !== undefined && !(pattern instanceof RegExp)) throw new TypeError('t.string: pattern must be a RegExp')
	return make<string, StringData & DataCommon>(pattern === undefined ? { kind: 'string' } : { kind: 'string', pattern })
}

function json<S extends StandardSchemaV1>(
	schema: S
): Descriptor<StandardSchemaV1.InferOutput<S>, false, JsonData & DataCommon>
function json<T = unknown>(): Descriptor<T, false, JsonData & DataCommon>
function json(schema?: StandardSchemaV1) {
	if (schema === undefined) return make<unknown, JsonData & DataCommon>({ kind: 'json' })
	if (!isStandardSchema(schema)) throw new TypeError('t.json: schema must be a Standard Schema')
	return make<unknown, JsonData & DataCommon>({ kind: 'json', schema })
}

/**
 * Option type descriptors.
 * Each converts the raw argv string to a typed value and carries its constraints as readable data.
 */
export const t = {
	/**
	 * A string, optionally matching `pattern`.
	 * `t.string<T>({ pattern })` types the value as `T`: an author assertion, since a type cannot be checked against a regex.
	 */
	string,
	/**
	 * A finite number. An empty string, `NaN`, `Infinity` or trailing text is an invalid value.
	 */
	number(options?: NumberOptions): Descriptor<number, false, NumberData & DataCommon> {
		return make({ kind: 'number', ...checkBounds('t.number', options, false) })
	},
	/**
	 * An integer. `min` and `max` must be integers.
	 */
	int(options?: NumberOptions): Descriptor<number, false, IntData & DataCommon> {
		return make({ kind: 'int', ...checkBounds('t.int', options, true) })
	},
	/**
	 * `true` when the flag is present. It takes no value; `--flag=true` and `--flag=false` are accepted.
	 */
	boolean(): Descriptor<boolean, false, BooleanData & DataCommon> {
		return make({ kind: 'boolean' })
	},
	/**
	 * Exactly `value`. A boolean literal is a flag and takes no value.
	 */
	literal<const V extends Scalar>(value: V): Descriptor<V, false, LiteralData & DataCommon> {
		const type = typeof value
		if (!(type === 'string' || type === 'boolean' || (type === 'number' && Number.isFinite(value)))) {
			throw new TypeError(`t.literal: value must be a string, a finite number or a boolean, got ${String(value)}`)
		}
		return make({ kind: 'literal', value })
	},
	/**
	 * One string of a non-empty tuple.
	 */
	enum<const V extends readonly [string, ...string[]]>(values: V): Descriptor<V[number], false, EnumData & DataCommon> {
		if (!Array.isArray(values) || values.length === 0) throw new TypeError('t.enum: values must be a non-empty array')
		for (const v of values) {
			if (typeof v !== 'string') throw new TypeError(`t.enum: values must be strings, got ${String(v)}`)
		}
		return make({ kind: 'enum', values: Object.freeze([...values]) as unknown as V })
	},
	/**
	 * Every occurrence of the option, each converted and checked by `element`, in order.
	 */
	array<E extends ElementDescriptor>(element: E): Descriptor<OutputOf<E>[], false, ArrayData & DataCommon> {
		const data: unknown = element
		if (!isDescriptor(data)) throw new TypeError('t.array: element must be a descriptor')
		if (data.kind === 'array') throw new TypeError('t.array: element cannot be an array')
		if (data.isOptional) throw new TypeError('t.array: element cannot be optional')
		return make({ kind: 'array', element })
	},
	/**
	 * Converts the raw string with `convert`, which may be async.
	 * Throwing (or rejecting with) a plain `Error` reports an invalid value with its message;
	 * any other throw propagates.
	 */
	custom<V>(convert: (raw: string) => V): Descriptor<Awaited<V>, false, CustomData & DataCommon> {
		if (typeof convert !== 'function') throw new TypeError('t.custom: convert must be a function')
		return make({ kind: 'custom', convert })
	},
	/**
	 * A JSON value parsed from the raw string.
	 * `t.json()` is `unknown`, `t.json<T>()` asserts `T` (only the JSON syntax is checked),
	 * and `t.json(schema)` validates with a Standard Schema and uses its output.
	 */
	json
}

/**
 * Whether a value is a descriptor created by `t`,
 * from this copy of args-minus or from any other copy with the same descriptor format.
 */
export function isDescriptor(value: unknown): value is AnyDescriptor {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { [descriptorBrand]?: unknown })[descriptorBrand] === descriptorVersion &&
		typeof (value as Partial<Data>).kind === 'string'
	)
}
