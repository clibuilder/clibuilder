import type { cli } from '../cli.js'
import type { Command } from '../command/internal.js'
import type { lookupCommand } from '../invocation/lookup.js'
import type { ErrorFields } from './encode.js'
import { formatLookupError } from './error.js'
import { generateUsageSection } from './help.js'

// How core reports a usage error under `cli({ output: 'axi' })` (axi-native RFC section 3.3).
// The ranking and the per-error help come from `@clibuilder/axi`'s `usage.ts`.

// the error to fix first leads: a mistyped option usually explains the rest,
// such as a value it swallowed being reported as a missing argument
const rank: Record<lookupCommand.Error['type'], number> = {
	'invalid-key': 0,
	'conflicting-options': 1,
	'invalid-value': 2,
	'expect-single': 3,
	'missing-argument': 4,
	'extra-arguments': 5
}

/** The usage error to report: the first of the highest rank, in the order they were found. */
export function topUsageError<E extends lookupCommand.Error>(errors: readonly E[]): E | undefined {
	return errors.reduce<E | undefined>((top, e) => (!top || rank[e.type] < rank[top.type] ? e : top), undefined)
}

const codes = {
	'invalid-key': 'unknown-option',
	'conflicting-options': 'conflicting-options',
	'invalid-value': 'invalid-value',
	'expect-single': 'expect-single',
	'missing-argument': 'missing-argument',
	'extra-arguments': 'extra-arguments'
} as const satisfies Record<lookupCommand.Error['type'], string>

/** The stable kebab-case code of a usage error. */
export function usageErrorCode<E extends lookupCommand.Error>(error: E): NonNullable<E['code']> {
	return codes[error.type] as any
}

/**
 * One usage error as an agent reads it: message, `code`, the offending option or argument in `details`,
 * and `help` with the usage line and, where it fixes the mistake, what is valid.
 * `hasHelp` is false for `runScript()`, which takes no `--help`, so the valid options do not offer it.
 */
export function describeUsageError(
	error: lookupCommand.Error,
	command: cli.Command,
	cliName: string,
	hasHelp = true
): Required<ErrorFields> {
	const usage = generateUsageSection(cliName, command as Command)
	const message = formatLookupError(error, command)
	const code = usageErrorCode(error)
	switch (error.type) {
		case 'invalid-key':
			return {
				message,
				code,
				details: { option: optionName(error.key) },
				help: [usage, optionsHelp(command, cliName, hasHelp)]
			}
		case 'conflicting-options':
			return {
				message,
				code,
				details: { option: optionName(error.key), conflictsWith: optionName(error.conflictsWith) },
				help: [usage]
			}
		case 'invalid-value': {
			const name = keyName(error.key, command)
			return {
				message,
				code,
				details: { ...name.details, ...(error.value === undefined ? {} : { value: rawValue(error.value) }) },
				help: [usage, ...valueHelp(error, name.label)]
			}
		}
		case 'expect-single':
			return {
				message,
				code,
				details: { ...keyName(error.key, command).details, value: toArray(error.value).map(String) },
				help: [usage]
			}
		case 'missing-argument': {
			// an option declared with `t` that is neither optional nor defaulted must be passed
			const isOption = !command.arguments?.some((a) => a.name === error.name) && !!command.options?.[error.name]
			return isOption
				? {
						message,
						code,
						details: { option: optionName(error.name) },
						help: [usage, optionsHelp(command, cliName, hasHelp)]
					}
				: { message, code, details: { argument: error.name }, help: [usage, argumentsHelp(command, cliName)] }
		}
		case 'extra-arguments':
			return { message, code, details: { arguments: error.values }, help: [usage, argumentsHelp(command, cliName)] }
	}
}

/** A command group invoked without its sub-command (#609): `missing-command`, with the valid sub-commands in `help`. */
export function describeMissingCommand(command: cli.Command, cliName: string): Required<ErrorFields> {
	const name = commandName(command, cliName)
	const commands = (command.commands ?? []).map((c) => c.name)
	return {
		message: `missing command for \`${name}\``,
		code: 'missing-command',
		details: { command: name },
		help: [
			generateUsageSection(cliName, command as Command),
			commands.length > 0
				? `valid commands for \`${name}\`: ${commands.join(', ')}`
				: `\`${name}\` has no commands (--help always allowed)`
		]
	}
}

// the reserved keys of an error report, which a config key is never written over
const reservedKeys = ['error', 'code', 'help']

/**
 * A config that fails the command's schema: `invalid-config`, with the messages per failing key (dotted path) in `details`.
 * A key named like a reserved one (`error`, `code`, `help`) is written as `config.<key>`.
 */
export function describeInvalidConfig(errors: Record<string, string[] | undefined>): Required<ErrorFields> {
	const details: Record<string, string[]> = {}
	for (const [key, messages] of Object.entries(errors)) {
		if (messages) details[reservedKeys.includes(key) ? `config.${key}` : key] = messages
	}
	return { message: 'config fails validation', code: 'invalid-config', details, help: [] }
}

function optionName(key: string) {
	return key.length === 1 ? `-${key}` : `--${key}`
}

function keyName(key: string, command: cli.Command) {
	return command.arguments?.some((a) => a.name === key)
		? { label: `<${key}>`, details: { argument: key } }
		: { label: optionName(key), details: { option: optionName(key) } }
}

function commandName(command: cli.Command, cliName: string) {
	const names: string[] = []
	for (let c: Command | undefined = command; c; c = c.parent) if (c.name) names.unshift(c.name)
	return [cliName, ...names].join(' ')
}

function isOptional(type: cli.Command.Type | undefined) {
	return !!type?.isOptional
}

function argumentsHelp(command: cli.Command, cliName: string) {
	const name = command.name || cliName
	const commands = (command.commands ?? []).map((c) => c.name)
	if (!command.arguments?.length && commands.length > 0) return `valid commands for \`${name}\`: ${commands.join(', ')}`
	const args = (command.arguments ?? []).map((a) => (isOptional(a.type) ? `[${a.name}]` : `<${a.name}>`))
	return args.length > 0 ? `\`${name}\` takes: ${args.join(' ')}` : `\`${name}\` takes no arguments`
}

function optionsHelp(command: cli.Command, cliName: string, hasHelp: boolean) {
	const name = command.name || cliName
	const options = Object.keys(command.options ?? {}).map(optionName)
	const help = hasHelp ? ' (--help always allowed)' : ''
	return options.length > 0
		? `valid options for \`${name}\`: ${options.join(', ')}${help}`
		: `\`${name}\` takes no options${help}`
}

function valueHelp(error: lookupCommand.InvalidValueType, label: string) {
	const at = error.index === undefined ? '' : `[${error.index}]`
	const received = error.value === undefined ? '' : ` (received ${toArray(error.value).map(quote).join(', ')})`
	if (error.allowed?.length) return [`allowed for ${label}${at}: ${error.allowed.join(', ')}${received}`]
	if (error.constraint) return [`expected for ${label}${at}: ${error.constraint}${received}`]
	return []
}

function rawValue(value: unknown) {
	return Array.isArray(value) ? value.map(String) : String(value)
}

function quote(value: unknown) {
	return `"${String(value)}"`
}

function toArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [value]
}
