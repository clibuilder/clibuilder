import { findKey, reduceByKey } from 'type-plus'
import type { cli } from '../cli.js'
import { takesValue } from '../descriptor.js'
import { type DescriptorKind, isDescriptor } from '../t.js'
import { isZodArray, isZodBoolean, isZodEnum, isZodNumber, isZodOptional, isZodString, z } from '../zod.js'
import type { parseArgv } from './argv.js'
import { type OptionOccurrence, optionOccurrences } from './argv_occurrences.js'
import type { DescriptorInput, DescriptorOccurrence } from './descriptors.js'

export namespace lookupCommand {
	export type Result = {
		command: cli.Command
		args: {
			__?: string[] | undefined
		} & Record<string, string[]>
		errors: Error[]
		/**
		 * The matched command's `t` declarations, with their raw input,
		 * for `convertDescriptors()` to convert and check.
		 */
		descriptors: DescriptorInput[]
	}
	/**
	 * One error found while parsing the arguments.
	 *
	 * `code` is the error's stable kebab-case name, the one an agent or a runtime branches on:
	 * `unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`.
	 * It sits next to `type`, which keeps its v11 values (`invalid-key` is `unknown-option`).
	 * clibuilder sets it on the errors it hands to `onUsageError`. It is optional only so that code building
	 * an error keeps compiling, and in v11 it is not enumerable, so spreading or serializing an error is unchanged.
	 */
	export type Error =
		| InvalidKey
		| InvalidValueType
		| ExpectSingle
		| ExtraArguments
		| MissingArgument
		| ConflictingOptions
	export type InvalidKey = {
		type: 'invalid-key'
		/** @see Error.code */
		code?: 'unknown-option'
		key: string
	}
	export type ExpectSingle = {
		type: 'expect-single'
		/** @see Error.code */
		code?: 'expect-single'
		key: string
		/**
		 * What the option takes, as a kind string:
		 * `boolean`, `number` or `string`, or the `kind` of a `t` descriptor.
		 * A zod type with no such kind, such as `z.enum`, is `enum`, `literal`, `array` or `custom`.
		 *
		 * clibuilder always sets it. It is optional only so that code building an `ExpectSingle` keeps compiling.
		 */
		keyKind?: DescriptorKind
		/**
		 * The zod type of a zod-declared option. `undefined` for an option declared with `t`.
		 *
		 * @deprecated read `keyKind`. Removed with the zod path in v12.
		 */
		keyType?: z.ZodType<any>
		value: any
	}
	export type InvalidValueType = {
		type: 'invalid-value'
		/** @see Error.code */
		code?: 'invalid-value'
		key: string
		/**
		 * What was wrong, in the caller's terms.
		 */
		message: string
		/**
		 * The value as the caller typed it.
		 * `undefined` when an option declared with `t` was given no value.
		 */
		value: any
		/**
		 * The `kind` of the `t` descriptor. Only set for a declaration with `t`.
		 */
		keyKind?: DescriptorKind
		/**
		 * What the declaration accepts, as help shows it, e.g. `int 1..65535` or `toon|text|json`.
		 * Only set for a declaration with `t`.
		 */
		constraint?: string
		/**
		 * The values a `t.enum` declaration accepts.
		 */
		allowed?: readonly string[]
		/**
		 * For a `t.array` declaration, the index of the element that failed.
		 */
		index?: number
	}
	export type ExtraArguments = {
		type: 'extra-arguments'
		/** @see Error.code */
		code?: 'extra-arguments'
		name: string
		values: string[]
	}
	/**
	 * Two options that declare a conflict were both passed.
	 * `key` and `conflictsWith` are the keys as the caller typed them.
	 */
	export type ConflictingOptions = {
		type: 'conflicting-options'
		/** @see Error.code */
		code?: 'conflicting-options'
		key: string
		conflictsWith: string
	}
	export type MissingArgument = {
		type: 'missing-argument'
		/** @see Error.code */
		code?: 'missing-argument'
		name: string
	}
}

/**
 * @param fallback a command whose options apply to every command (the global options).
 * It only decides how many following tokens such an option takes.
 */
export function lookupCommand(
	command: cli.Command,
	args: parseArgv.Result,
	fallback?: cli.Command
): lookupCommand.Result {
	const m = matchCommand(command, args)!
	const [rawArgs, occurrences] = assignOptionValues(m[1], m[0], fallback)
	return processCommand(m[0], rawArgs, occurrences)
}

function matchCommand(command: cli.Command, rawArgs: parseArgv.Result): [cli.Command, parseArgv.Result] | undefined {
	if (command.commands) {
		const commands = command.commands
		for (let i = commands.length - 1; i >= 0; i--) {
			const command = commands[i]
			if (!command.name) return [command, rawArgs]
			if (rawArgs._[0] !== command.name && !command.alias?.includes(rawArgs._[0])) continue
			rawArgs._.shift()
			if (command.commands) {
				const m = matchCommand(command, rawArgs)
				return m ? m : [command, rawArgs]
			}
			return [command, rawArgs]
		}
	}
	return [command, rawArgs]
}

/**
 * Gives each option the following tokens its declared type takes, and the rest back to the positionals.
 *
 * The parser attaches every token after an option to it, because it does not know the
 * option's type. A boolean takes none of them (except a literal `true`/`false`), a scalar
 * takes one, and an array takes them all. An option the command does not declare keeps
 * them all, so the invalid key is reported with what the caller passed.
 */
function assignOptionValues(
	rawArgs: parseArgv.Result,
	command: cli.Command,
	fallback: cli.Command | undefined
): [parseArgv.Result, DescriptorOccurrence[] | undefined] {
	const occurrences = optionOccurrences.get(rawArgs)
	if (!occurrences) return [rawArgs, undefined]
	const values: Record<string, string[]> = {}
	const positionals: string[] = []
	// the argv tokens of each option the command declares with `t`, for `args-minus` to parse
	const descriptorOccurrences: DescriptorOccurrence[] = []
	for (const o of occurrences) {
		const declared = lookupOptions(command, o.key)[1]
		const entry = declared ?? (fallback && lookupOptions(fallback, o.key)[1])
		const count = countFollowing(entry, o)
		const taken = o.following.slice(0, count)
		if (isDescriptor(declared?.type)) descriptorOccurrences.push({ key: o.key, tokens: [o.raw, ...taken] })
		positionals.push(...o.following.slice(count))
		const own = o.inline.length + taken.length > 0 ? [...o.inline, ...taken] : ['true']
		values[o.key] = [...(values[o.key] ?? []), ...own]
	}
	const result: parseArgv.Result = { ...rawArgs, _: [...rawArgs._, ...positionals] }
	// a key missing from `rawArgs` was removed by the caller (`builder` consumes the global flags).
	for (const key of Object.keys(values)) if (rawArgs[key]) result[key] = values[key]!
	return [result, descriptorOccurrences]
}

function countFollowing(entry: cli.Command.Options.Entry | undefined, o: OptionOccurrence) {
	if (!entry) return o.following.length
	// as `args-minus` reads it: a value-taking option takes the next token unless it has an inline value,
	// a flag takes none, and an array takes one value per occurrence
	if (isDescriptor(entry.type)) return o.inline.length === 0 && takesValue(entry.type) ? 1 : 0
	// an option without a declared type is a boolean, matching `cli.Command.RunArgs`
	const type = unwrapOptional(entry.type ?? z.boolean())
	if (isZodArray(type)) return o.following.length
	if (o.inline.length > 0) return 0
	if (isZodBoolean(type)) return /^(true|false)$/i.test(o.following[0] ?? '') ? 1 : 0
	return 1
}

export type State = {
	command: cli.Command
	rawArgs: parseArgv.Result
	errors: lookupCommand.Error[]
	args: { _: string[] } & Record<string, any>
	descriptors: DescriptorInput[]
}
function processCommand(
	command: cli.Command,
	rawArgs: parseArgv.Result,
	occurrences: DescriptorOccurrence[] | undefined
) {
	const state: State = { command, rawArgs, args: { _: [] }, errors: [], descriptors: [] }
	return collectDescriptorOptions(
		fillDefaultOptions(checkConflicts(fillInputOptions(fillArguments(state)))),
		occurrences
	)
}

function fillArguments(state: State) {
	const command = state.command
	const args = [...state.rawArgs._]
	const argSpecs = command.arguments || []
	state.args = argSpecs.reduce(
		(p, s) => {
			// an argument without a declared type is a string, matching `cli.Command.RunArgs`
			const type = s.type ?? z.string()
			if (isDescriptor(type)) {
				if (args.length === 0) {
					if (!type.isOptional) state.errors.push({ type: 'missing-argument', name: s.name })
					return p
				}
				// an array argument is variadic: it consumes the remaining positionals
				const values = type.kind === 'array' ? args.splice(0) : [args.shift()!]
				state.descriptors.push({ type: 'argument', name: s.name, descriptor: type, values })
				return p
			}
			if (args.length === 0) {
				if (!isZodOptional(type)) state.errors.push({ type: 'missing-argument', name: s.name })
				return p
			}
			// an array argument is variadic: it consumes the remaining positionals
			const values = isZodArray(unwrapOptional(type)) ? args.splice(0) : [args.shift()!]
			const [value, errors] = convertValue(type, s.name, values)
			state.errors.push(...errors)
			p.args[s.name] = value
			return p
		},
		{ args: { _: [] } as { _: string[] } & Record<any, any> }
	).args
	if (args.length > 0) {
		state.errors.push({ type: 'extra-arguments', name: command.name, values: args })
	}
	return state
}
function fillInputOptions(state: State) {
	return reduceByKey(
		state.rawArgs,
		(s, key) => {
			if (key === '_') return s
			if (/^-/.test(key)) {
				// This is the case when user pass in with more then 3 dashes (`---abc`).
				s.errors.push({ type: 'invalid-key', key })
				return s
			}
			const [name, optionEntry] = lookupOptions(state.command!, key)
			if (!name) {
				s.errors.push({ type: 'invalid-key', key })
				return s
			}
			const type = optionEntry!.type
			if (isDescriptor(type)) {
				// converted by `convertDescriptors()`; a repeated scalar is reported here, as for a zod option
				const values = state.rawArgs[key]
				if (type.kind !== 'array' && values.length > 1) {
					s.errors.push({ type: 'expect-single', key, keyKind: type.kind, value: values })
				}
				return s
			}
			// an option without a declared type is a boolean, matching `cli.Command.RunArgs`
			const [value, errors] = convertValue(type || z.optional(z.boolean()), key, state.rawArgs[key])
			if (errors) s.errors.push(...errors)
			s.args[name] = value

			return s
		},
		state
	)
}

/**
 * Reports each pair of passed options where either side declares the other in `conflicts`.
 * Runs before the defaults are filled, so a default never counts as passed.
 */
function checkConflicts(state: State) {
	const options = state.command.options
	if (!options) return state
	// option name -> key as typed, in the order the caller passed them
	const passed = new Map<string, string>()
	for (const key of Object.keys(state.rawArgs)) {
		const [name] = lookupOptions(state.command, key)
		if (name && !passed.has(name)) passed.set(name, key)
	}
	const names = [...passed.keys()]
	for (let i = 0; i < names.length; i++) {
		for (let j = i + 1; j < names.length; j++) {
			const [a, b] = [names[i], names[j]]
			if (!options[a].conflicts?.includes(b) && !options[b].conflicts?.includes(a)) continue
			// name the side that declares the conflict first, so the message reads the way it was declared
			const [key, other] = options[a].conflicts?.includes(b) ? [a, b] : [b, a]
			state.errors.push({ type: 'conflicting-options', key: passed.get(key)!, conflictsWith: passed.get(other)! })
		}
	}
	return state
}

function fillDefaultOptions(state: State) {
	const optionsMap = state.command.options || {}
	return reduceByKey(
		optionsMap,
		(p, key) => {
			if (p.args[key] !== undefined) return p

			const options = optionsMap[key]
			// `args-minus` applies the default of a `t` declaration, and runs its checks on it
			if (isDescriptor(options.type)) return p
			if (typeof options === 'string' || options.default === undefined) return p

			p.args[key] = isZodArray(options.type) && !Array.isArray(options.default) ? [options.default] : options.default
			return p
		},
		state
	)
}

/**
 * Hands every option declared with `t` to `convertDescriptors()` with its argv tokens,
 * whether it was passed or not: `args-minus` applies its default or reports it missing.
 * An option already reported as given more than once is left out.
 */
function collectDescriptorOptions(state: State, occurrences: DescriptorOccurrence[] | undefined) {
	const options = state.command.options ?? {}
	for (const name of Object.keys(options)) {
		const entry = options[name]!
		if (!isDescriptor(entry.type)) continue
		const keys = Object.keys(state.rawArgs).filter(
			(key) => key !== '_' && lookupOptions(state.command, key)[0] === name
		)
		if (state.errors.some((e) => e.type === 'expect-single' && keys.includes(e.key))) continue
		state.descriptors.push({
			type: 'option',
			name,
			entry: { ...entry, type: entry.type },
			// without the argv occurrences, the values are given inline
			occurrences: occurrences
				? occurrences.filter((o) => keys.includes(o.key))
				: keys.flatMap((key) => state.rawArgs[key]!.map((v) => ({ key, tokens: [`--${name}=${v}`] })))
		})
	}
	return state
}

/**
 * Finds the option a key refers to, by name or by alias.
 * Returns an empty tuple when the command declares no such option.
 */
export function lookupOptions(command: cli.Command, key: string): [string, cli.Command.Options.Entry] | [] {
	const opts = command.options
	if (!opts) return []
	const options = opts[key]
	if (options) return [key, options]
	const optKey = findKey(opts, (k) => {
		const opt = opts[k]
		if (!opt.alias) return false
		return opt.alias.some((a) => a === key || (a as { alias: string }).alias === key)
	})
	return optKey ? [optKey, opts[optKey]] : []
}

function unwrapOptional(t: z.ZodType<any>): z.ZodType<any> {
	return isZodOptional(t) ? t._def.innerType : t
}

function convertValue(t: z.ZodType<any>, key: string, values: string[]): [any, lookupCommand.Error[]] {
	const [r, errors] = parse(t, key, values)
	if (r.success) return [r.data, errors]
	// `toParsable` reports the conversions it performs itself (boolean, number). Every other
	// type — an enum most of all — is only rejected by the schema, and dropping that
	// rejection is worse than it looks: the option falls back to its default, so the caller
	// gets plausible output for a value the cli never honoured.
	if (errors.length === 0) {
		errors.push({ type: 'invalid-value', key, value: values[values.length - 1], message: describeValue(t, r.error) })
	}
	return [undefined, errors]
}

/**
 * Says what the option would have accepted, in the caller's terms.
 *
 * An enum knows its own values, and listing them is what lets the caller fix the
 * invocation in one step. Anything else falls back to what the schema said, which is
 * still more specific than "invalid".
 */
function describeValue(t: z.ZodType<any>, error: z.ZodError) {
	const inner = unwrapOptional(t)
	if (isZodEnum(inner)) return `expected one of: ${inner.options.join(', ')}`
	return error.issues[0]!.message
}

function parse(t: z.ZodType<any>, key: string, values: string[]) {
	const [v, errors] = toParsable(t, key, values, [])
	return [t.safeParse(v), errors] as const
}

function toParsable(
	t: z.ZodType<any>,
	key: string,
	values: string[],
	errors: lookupCommand.Error[]
): [any, lookupCommand.Error[]] {
	if (isZodOptional(t)) {
		return toParsable(t._def.innerType, key, values, errors)
	}
	if (isZodBoolean(t)) {
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyKind: 'boolean', keyType: t, value: values })
		return toBoolean(key, values[values.length - 1], errors)
	}
	if (isZodNumber(t)) {
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyKind: 'number', keyType: t, value: values })
		return toNumber(key, values[values.length - 1], errors)
	}
	if (isZodString(t)) {
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyKind: 'string', keyType: t, value: values })
		return [values[values.length - 1], errors]
	}
	if (isZodArray(t)) {
		const e = t.element
		if (isZodBoolean(e)) {
			return values.reduce(
				([i, e], v) => {
					const [r, errors] = toBoolean(key, v, e)
					i.push(r)
					return [i, errors]
				},
				[[] as Array<boolean | undefined>, errors]
			)
		}
		if (isZodNumber(e)) {
			return values.reduce(
				([i, e], v) => {
					const [r, errors] = toNumber(key, v, e)
					i.push(r)
					return [i, errors]
				},
				[[] as Array<number | undefined>, errors]
			)
		}
		if (isZodString(e)) {
			return [values, errors]
		}
	}
	// zod type without a dedicated string conversion (e.g. `z.enum`).
	// hand the raw value to `safeParse` and let the schema itself accept or reject it.
	if (values.length > 1) errors.push({ type: 'expect-single', key, keyKind: zodKind(t), keyType: t, value: values })
	return [values[values.length - 1], errors]
}

function toBoolean(
	key: string,
	value: string,
	errors: lookupCommand.Error[]
): [boolean | undefined, lookupCommand.Error[]] {
	if (value.toLowerCase() === 'true') return [true, errors]
	if (value.toLowerCase() === 'false') return [false, errors]
	errors.push({ type: 'invalid-value', key, value, message: 'expected to be boolean' })
	return [undefined, errors]
}

function toNumber(
	key: string,
	value: string,
	errors: lookupCommand.Error[]
): [number | undefined, lookupCommand.Error[]] {
	const num = +value
	if (typeof num === 'number' && !Number.isNaN(num)) return [num, errors]

	errors.push({ type: 'invalid-value', key, value, message: 'expected to be number' })
	return [undefined, errors]
}

/**
 * The kind string of a zod type that has no dedicated conversion, for `ExpectSingle.keyKind`.
 */
function zodKind(t: z.ZodType<any>): DescriptorKind {
	if (isZodEnum(t)) return 'enum'
	if (t instanceof z.ZodLiteral) return 'literal'
	if (isZodArray(t)) return 'array'
	return 'custom'
}
