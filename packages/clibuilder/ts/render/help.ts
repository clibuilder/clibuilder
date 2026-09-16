import padRight from 'pad-right'
import { tersify } from 'tersify'
import { reduceByKey, someKey } from 'type-plus'
import wordwrap from 'wordwrap'
import type { cli } from '../cli.js'
import type { Command } from '../command/internal.js'
import { isZodArray, isZodBoolean, isZodNumber, isZodObject, isZodOptional, isZodString, type z } from '../zod.js'

/**
 * Renders a command's help text from its declaration.
 *
 * Pure: it takes a declaration and returns a string. Nothing here reaches a
 * logger, a filesystem or a process — deciding *when* to show help belongs to
 * `execution`, and writing it belongs to the ui.
 */

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)

export function generateHelpMessage(cliName: string, command: Command) {
	const helpSections = [
		generateUsageSection(cliName, command),
		generateDescriptionSection(command),
		generateCommandsSection(command),
		generateArgumentsSection(command),
		generateOptionsSection(command),
		generateAliasSection(command),
		generateConfigSection(command)
	].filter((m) => !!m)
	return `
${helpSections.join('\n\n')}
`
}

function generateUsageSection(cliName: string, command: Command) {
	const nameChain = getCommandNameChain(cliName, command)
	const hasCommand = command.commands && command.commands.length > 0
	let message = `Usage: ${nameChain.join(' ')}${hasCommand ? ' <command>' : ''}`
	if (command.arguments) {
		message += command.arguments.some((a) => isRequired(a, true)) ? ' <arguments>' : ' [arguments]'
	}
	if (command.options) {
		message += someKey(command.options, (k) => isRequired(command.options![k], false)) ? ' <options>' : ' [options]'
	}
	return message
}

function isRequired({ type }: { type?: z.ZodType<any> }, defaultValue: boolean) {
	if (!type) return defaultValue
	return !type.isOptional()
}

function generateDescriptionSection(command: Command) {
	return command.description ? `  ${command.description}` : ''
}

function getCommandNameChain(cliName: string, command: Command) {
	const commands = [command]
	while (command.parent) {
		commands.unshift(command.parent)
		command = command.parent
	}
	return [cliName, ...commands.map((c) => c.name).filter((x) => x)]
}

function generateCommandsSection(command: Command) {
	const commandNames = getCommandsNamesAndAlias(command.commands)
	if (commandNames.length === 0) return ''

	return `Commands:
  ${wrap(commandNames.join(', '))}

${padRight(command.name ? `${command.name} <command> -h` : '  <command> -h', MIN_LHS_WIDTH, ' ')}Get help for <command>`
}

function getCommandsNamesAndAlias(commands: cli.Command[] | undefined) {
	const result: string[] = []
	if (commands) {
		commands.forEach((c) => {
			if (c.alias) {
				result.push(`${c.name} (${c.alias.join('|')})`)
			} else result.push(c.name)
		})
	}
	return result
}

function generateArgumentsSection(command: Command) {
	if (!command.arguments) {
		return ''
	}

	let message = 'Arguments:\n'
	const entries: string[][] = []
	let maxWidth = 0
	command.arguments.forEach((a) => {
		const argStr = formatSignature(a.name, a.type, { defaultRequired: true, booleanIsFlag: false })
		maxWidth = Math.max(maxWidth, argStr.length)
		entries.push([argStr, a.description || ''])
	})

	const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxWidth + RIGHT_PADDING)

	message += entries.map((e) => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`.trimEnd()).join('\n')
	return message
}

function generateOptionsSection(command: Command) {
	if (!command.options) return ''

	let message = 'Options:\n'
	const entries: string[][] = []
	let maxOptionStrWidth = 0
	for (const key in command.options) {
		const value = command.options[key]
		const optionStr = formatKeyValue(key, value)
		const description = formatDescription(value)
		entries.push([optionStr, description])
		maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
	}
	const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxOptionStrWidth + RIGHT_PADDING)

	message += entries.map((e) => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
	return message
}

function formatKeyValue(key: string, value: cli.Command.Options.Entry) {
	const alias = value.alias
		? (value.alias
				.map((a) => (typeof a === 'string' ? a : a.hidden ? undefined : a.alias))
				.filter((a) => a) as string[])
		: []
	const keyString = [...alias, key]
		.sort((a, b) => a.length - b.length)
		.map((v) => (v.length === 1 ? `-${v}` : `--${v}`))
		.join('|')
	return formatSignature(keyString, value.type, { defaultRequired: false, booleanIsFlag: true })
}

/**
 * Renders a name as it appears in the help output:
 * `<name>` when required, `[name]` when optional,
 * with a `=<type>` hint and a `...` variadic marker when the type is known.
 *
 * @param defaultRequired how a missing type is treated.
 * Arguments are required by default while options are optional by default.
 * @param booleanIsFlag options are flags so a `=boolean` hint is noise,
 * while a boolean argument is a value the user has to type out.
 */
function formatSignature(
	name: string,
	zodType: z.ZodTypeAny | undefined,
	{ defaultRequired, booleanIsFlag }: { defaultRequired: boolean; booleanIsFlag: boolean }
) {
	const required = zodType ? !isZodOptional(zodType) : defaultRequired
	const body = `${name}${formatTypeHint(zodType, booleanIsFlag)}`
	return required ? `<${body}>` : `[${body}]`
}

function formatTypeHint(zodType: z.ZodTypeAny | undefined, booleanIsFlag: boolean) {
	if (!zodType) return ''
	const t = isZodOptional(zodType) ? zodType._def.innerType : zodType
	const isArray = isZodArray(t)
	const at = isArray ? t.element : t
	const typeName = isZodString(at) ? 'string' : isZodNumber(at) ? 'number' : isZodBoolean(at) ? 'boolean' : ''
	if (isArray) return typeName ? `=${typeName}...` : '...'
	if (!typeName || (booleanIsFlag && typeName === 'boolean')) return ''
	return `=${typeName}`
}

function formatDescription(value: cli.Command.Options.Entry) {
	const d = value.type && isZodString(value.type) ? `'${value.default}'` : value.default
	return value.default ? `${value.description} (default ${d})` : value.description
}
function generateAliasSection(command: Command) {
	if (!command.alias) return ''
	return `Alias:
  ${wrap(command.alias.join(', '))}`
}

function generateConfigSection(command: Command) {
	if (!command.config) return ''
	return `Config:
${toPrettyType(command.config)}`
}

function toPrettyType(t: any): string {
	return tersify(toTypeObject(t), { maxLength: Number.POSITIVE_INFINITY }).replace(/'/g, '')
}
function toTypeObject(t: z.ZodAny): any {
	if (isZodObject(t)) {
		const shape = t.shape as Record<string, any>
		return reduceByKey(
			shape,
			(p, k) => {
				const t = shape[k]
				if (isZodOptional(t)) p[`${k}?`] = toTypeObject(t._def.innerType)
				else p[k] = toTypeObject(t)
				return p
			},
			{} as Record<string, any>
		)
	}
	if (isZodString(t)) return 'string'
	if (isZodBoolean(t)) return 'boolean'
	if (isZodNumber(t)) return 'number'
	if (isZodArray(t)) {
		if (isZodObject(t.element)) return `Array<${toPrettyType(t.element)}>`
		return `${toPrettyType(t.element)}[]`
	}
	// istanbul ignore next
	return ''
}
