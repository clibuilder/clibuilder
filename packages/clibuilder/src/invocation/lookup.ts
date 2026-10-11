import type { cli } from '../cli.js'
import { takesValue } from '../descriptor.js'
import { type AnyDescriptor, type DescriptorKind, t } from '../t.js'
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
		/** The matched command's declarations with their raw input, for `convertDescriptors()`. */
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
		 * What the option takes: the `kind` of its `t` descriptor.
		 *
		 * clibuilder always sets it. It is optional only so that code building an `ExpectSingle` keeps compiling.
		 */
		keyKind?: DescriptorKind
		value: any
	}
	export type InvalidValueType = {
		type: 'invalid-value'
		/** @see Error.code */
		code?: 'invalid-value'
		key: string
		/** What was wrong, in the caller's terms. */
		message: string
		/** The value as the caller typed it; `undefined` when the option was given no value. */
		value: any
		/**
		 * The `kind` of the declaration's `t` descriptor.
		 * Not set for the global `--format`.
		 */
		keyKind?: DescriptorKind
		/**
		 * What the declaration accepts, as help shows it, e.g. `int 1..65535` or `toon|text|json`.
		 * Not set for the global `--format`.
		 */
		constraint?: string
		/** The values a `t.enum` declaration, or the global `--format`, accepts. */
		allowed?: readonly string[]
		/** For a `t.array` declaration, the index of the element that failed. */
		index?: number
	}
	export type ExtraArguments = {
		type: 'extra-arguments'
		/** @see Error.code */
		code?: 'extra-arguments'
		name: string
		values: string[]
	}
	/** Two options that declare a conflict were both passed; the keys are as the caller typed them. */
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
 * It decides how many following tokens such an option takes,
 * and lets the option be given before the command path as well as after it.
 */
export function lookupCommand(
	command: cli.Command,
	args: parseArgv.Result,
	fallback?: cli.Command
): lookupCommand.Result {
	const m = matchCommand(command, createPathCursor(args, fallback))
	const [rawArgs, occurrences] = assignOptionValues(args, m, fallback)
	return processCommand(m, rawArgs, occurrences)
}

function matchCommand(command: cli.Command, path: PathCursor): cli.Command {
	if (command.commands) {
		const commands = command.commands
		const token = path.peek(command)
		for (let i = commands.length - 1; i >= 0; i--) {
			const command = commands[i]
			if (!command.name) return command
			if (token !== command.name && !command.alias?.includes(token!)) continue
			path.consume()
			return command.commands ? matchCommand(command, path) : command
		}
	}
	return command
}

type PathCursor = {
	/** The next token that may name a sub-command of `command`, or `undefined` when there is none. */
	peek(command: cli.Command): string | undefined
	/** Removes the token `peek()` returned: it names the matched command, so it is no positional. */
	consume(): void
}

/**
 * Walks the tokens that may name the command path: the positionals before the first option, then the tokens
 * after each global option that the option does not take as its value (#672).
 * It stops at the first non-global option, since a command's own option is only valid after the command.
 * Tokens after `--` are not walked.
 */
function createPathCursor(rawArgs: parseArgv.Result, fallback: cli.Command | undefined): PathCursor {
	const occurrences = optionOccurrences.get(rawArgs) ?? []
	// the token list `peek()` read from, and the index in it, or `undefined` when the walk ended
	let current: [string[], number] | undefined
	let next = -1
	let index = 0
	return {
		peek(command) {
			current = undefined
			if (next < 0) {
				if (index < rawArgs._.length) return (current = [rawArgs._, index])[0][index]
				next = 0
				index = -1
			}
			while (fallback && next < occurrences.length) {
				const o = occurrences[next]!
				if (index < 0) {
					const global = lookupOptions(fallback, o.key)[1]
					if (!global) return
					index = countFollowing(lookupOptions(command, o.key)[1] ?? global, o)
				}
				if (index < o.following.length) return (current = [o.following, index])[0][index]
				next++
				index = -1
			}
		},
		consume() {
			current![0].splice(current![1], 1)
		}
	}
}

/**
 * Gives each option the following tokens its declared type takes, and the rest back to the positionals.
 * The parser attaches every token after an option to it, as it does not know the type.
 * An option the command does not declare keeps them all, so the invalid key is reported with what the caller passed.
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
	// the argv tokens of each option the command declares, for `args-minus` to parse
	const descriptorOccurrences: DescriptorOccurrence[] = []
	for (const o of occurrences) {
		const declared = lookupOptions(command, o.key)[1]
		const entry = declared ?? (fallback && lookupOptions(fallback, o.key)[1])
		const count = countFollowing(entry, o)
		const taken = o.following.slice(0, count)
		if (declared) descriptorOccurrences.push({ key: o.key, tokens: [o.raw, ...taken] })
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
	return o.inline.length === 0 && takesValue(optionType(entry)) ? 1 : 0
}

// an option without a declared type is an optional flag, matching `cli.Command.RunArgs`
const flag = t.boolean().optional()
// an argument without a declared type is a string, matching `cli.Command.RunArgs`
const text = t.string()

function optionType(entry: cli.Command.Options.Entry): AnyDescriptor {
	return entry.type ?? flag
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
	return collectDescriptorOptions(checkConflicts(fillInputOptions(fillArguments(state))), occurrences)
}

function fillArguments(state: State) {
	const command = state.command
	const args = [...state.rawArgs._]
	const argSpecs = command.arguments || []
	for (const s of argSpecs) {
		const type = s.type ?? text
		if (args.length === 0) {
			if (!type.isOptional) state.errors.push({ type: 'missing-argument', name: s.name })
			continue
		}
		// an array argument is variadic: it consumes the remaining positionals
		const values = type.kind === 'array' ? args.splice(0) : [args.shift()!]
		state.descriptors.push({ type: 'argument', name: s.name, descriptor: type, values })
	}
	if (args.length > 0) {
		state.errors.push({ type: 'extra-arguments', name: command.name, values: args })
	}
	return state
}
function fillInputOptions(state: State) {
	for (const key of Object.keys(state.rawArgs)) {
		if (key === '_') continue
		if (/^-/.test(key)) {
			// three or more dashes (`---abc`)
			state.errors.push({ type: 'invalid-key', key })
			continue
		}
		const [name, entry] = lookupOptions(state.command, key)
		if (!name) {
			state.errors.push({ type: 'invalid-key', key })
			continue
		}
		// converted by `convertDescriptors()`; a repeated scalar is reported here
		const type = optionType(entry!)
		const values = state.rawArgs[key]
		if (type.kind !== 'array' && values.length > 1) {
			state.errors.push({ type: 'expect-single', key, keyKind: type.kind, value: values })
		}
	}
	return state
}

// runs before the defaults are filled, so a default never counts as passed
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

// every option goes to `convertDescriptors()`, passed or not: `args-minus` applies its default or reports it missing.
// An option already reported as given more than once is left out.
function collectDescriptorOptions(state: State, occurrences: DescriptorOccurrence[] | undefined) {
	const options = state.command.options ?? {}
	for (const name of Object.keys(options)) {
		const entry = options[name]!
		const keys = Object.keys(state.rawArgs).filter(
			(key) => key !== '_' && lookupOptions(state.command, key)[0] === name
		)
		if (state.errors.some((e) => e.type === 'expect-single' && keys.includes(e.key))) continue
		state.descriptors.push({
			type: 'option',
			name,
			entry: { ...entry, type: optionType(entry) },
			// without the argv occurrences, the values are given inline
			occurrences: occurrences
				? occurrences.filter((o) => keys.includes(o.key))
				: keys.flatMap((key) => state.rawArgs[key]!.map((v) => ({ key, tokens: [`--${name}=${v}`] })))
		})
	}
	return state
}

/** Finds the option a key refers to, by name or alias; an empty tuple when the command declares none. */
export function lookupOptions(command: cli.Command, key: string): [string, cli.Command.Options.Entry] | [] {
	const opts = command.options
	if (!opts) return []
	const options = opts[key]
	if (options) return [key, options]
	const optKey = Object.keys(opts).find((k) => {
		const opt = opts[k]
		if (!opt.alias) return false
		return opt.alias.some((a) => a === key || (a as { alias: string }).alias === key)
	})
	return optKey ? [optKey, opts[optKey]] : []
}
