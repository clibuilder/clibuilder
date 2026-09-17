import { findKey, reduceByKey } from 'type-plus'
import type { cli } from '../cli.js'
import { isZodArray, isZodBoolean, isZodEnum, isZodNumber, isZodOptional, isZodString, z } from '../zod.js'
import { type OptionOccurrence, optionOccurrences } from './argv_occurrences.js'
import type { parseArgv } from './argv.js'

export namespace lookupCommand {
	export type Result = {
		command: cli.Command
		args: {
			__?: string[] | undefined
		} & Record<string, string[]>
		errors: Error[]
	}
	export type Error =
		| InvalidKey
		| InvalidValueType
		| ExpectSingle
		| ExtraArguments
		| MissingArgument
		| ConflictingOptions
	export type InvalidKey = {
		type: 'invalid-key'
		key: string
	}
	export type ExpectSingle = {
		type: 'expect-single'
		key: string
		keyType: z.ZodType<any>
		value: any
	}
	export type InvalidValueType = {
		type: 'invalid-value'
		key: string
		message: string
		value: any
	}
	export type ExtraArguments = {
		type: 'extra-arguments'
		name: string
		values: string[]
	}
	/**
	 * Two options that declare a conflict were both passed.
	 * `key` and `conflictsWith` are the keys as the caller typed them.
	 */
	export type ConflictingOptions = {
		type: 'conflicting-options'
		key: string
		conflictsWith: string
	}
	export type MissingArgument = {
		type: 'missing-argument'
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
	return processCommand(m[0], assignOptionValues(m[1], m[0], fallback))
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
): parseArgv.Result {
	const occurrences = optionOccurrences.get(rawArgs)
	if (!occurrences) return rawArgs
	const values: Record<string, string[]> = {}
	const positionals: string[] = []
	for (const o of occurrences) {
		const entry = lookupOptions(command, o.key)[1] ?? (fallback && lookupOptions(fallback, o.key)[1])
		const count = countFollowing(entry, o)
		const taken = o.following.slice(0, count)
		positionals.push(...o.following.slice(count))
		const own = o.inline.length + taken.length > 0 ? [...o.inline, ...taken] : ['true']
		values[o.key] = [...(values[o.key] ?? []), ...own]
	}
	const result: parseArgv.Result = { ...rawArgs, _: [...rawArgs._, ...positionals] }
	// a key missing from `rawArgs` was removed by the caller (`builder` consumes the global flags).
	for (const key of Object.keys(values)) if (rawArgs[key]) result[key] = values[key]!
	return result
}

function countFollowing(entry: cli.Command.Options.Entry | undefined, o: OptionOccurrence) {
	if (!entry) return o.following.length
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
}
function processCommand(command: cli.Command, rawArgs: parseArgv.Result) {
	const state: State = { command, rawArgs, args: { _: [] }, errors: [] }
	return fillDefaultOptions(checkConflicts(fillInputOptions(fillArguments(state))))
}

function fillArguments(state: State) {
	const command = state.command
	const args = [...state.rawArgs._]
	const argSpecs = command.arguments || []
	state.args = argSpecs.reduce(
		(p, s) => {
			// an argument without a declared type is a string, matching `cli.Command.RunArgs`
			const type = s.type ?? z.string()
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
			// an option without a declared type is a boolean, matching `cli.Command.RunArgs`
			const [value, errors] = convertValue(optionEntry!.type || z.optional(z.boolean()), key, state.rawArgs[key])
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
			if (p.args[key]) return p

			const options = optionsMap[key]
			if (typeof options === 'string' || options.default === undefined) return p

			p.args[key] = isZodArray(options.type) && !Array.isArray(options.default) ? [options.default] : options.default
			return p
		},
		state
	)
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
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
		return toBoolean(key, values[values.length - 1], errors)
	}
	if (isZodNumber(t)) {
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
		return toNumber(key, values[values.length - 1], errors)
	}
	if (isZodString(t)) {
		if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
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
	if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
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
