import type { StandardJSONSchemaV1 } from 'args-minus'
import padRight from 'pad-right'
import { tersify } from 'tersify'
import { reduceByKey, someKey } from 'type-plus'
import wordwrap from 'wordwrap'
import type { cli } from '../cli.js'
import type { Command } from '../command/internal.js'
import { describeConstraint, takesValue } from '../descriptor.js'
import { type AnyDescriptor, type DescriptorData, isDescriptor, type StandardSchemaV1 } from '../t.js'
import {
	isZod3Type,
	isZodArray,
	isZodBoolean,
	isZodNumber,
	isZodObject,
	isZodOptional,
	isZodString,
	type z
} from '../zod.js'

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
		generateConfigSection(command),
		generateExamplesSection(command)
	].filter((m) => !!m)
	return `
${helpSections.join('\n\n')}
`
}

export function generateUsageSection(cliName: string, command: Command) {
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

function isRequired({ type, default: d }: { type?: cli.Command.Type; default?: unknown }, defaultValue: boolean) {
	if (!type) return defaultValue
	// a `t` option with a default need not be passed
	if (isDescriptor(type)) return !type.isOptional && d === undefined
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
		const argStr = isDescriptor(a.type)
			? formatArgumentDescriptor(a.name, a.type)
			: formatSignature(a.name, a.type, { defaultRequired: true, booleanIsFlag: false })
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
		const description = formatDescription(value, conflictsOf(key, command.options))
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
	if (isDescriptor(value.type)) return formatOptionDescriptor(keyString, value.type, isRequired(value, false))
	return formatSignature(keyString, value.type, { defaultRequired: false, booleanIsFlag: true })
}

/**
 * Renders an option declared with `t` from its introspection data:
 * `[--port <int 1..65535>]`, `[--tag <string>...]`, `[--dry]`,
 * without the brackets when it must be passed.
 */
function formatOptionDescriptor(keys: string, descriptor: AnyDescriptor, required: boolean) {
	const value = takesValue(descriptor) ? ` <${describeConstraint(descriptor)}>` : ''
	const body = `${keys}${value}${descriptor.kind === 'array' ? '...' : ''}`
	return required ? body : `[${body}]`
}

/**
 * Renders an argument declared with `t` from its introspection data:
 * `<port: int 1..65535>`, `[name: string]`, `<files: string...>`.
 */
function formatArgumentDescriptor(name: string, descriptor: AnyDescriptor) {
	const body = `${name}: ${describeConstraint(descriptor)}${descriptor.kind === 'array' ? '...' : ''}`
	return descriptor.isOptional ? `[${body}]` : `<${body}>`
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
	zodType: z.ZodType<any> | undefined,
	{ defaultRequired, booleanIsFlag }: { defaultRequired: boolean; booleanIsFlag: boolean }
) {
	const required = zodType ? !isZodOptional(zodType) : defaultRequired
	const body = `${name}${formatTypeHint(zodType, booleanIsFlag)}`
	return required ? `<${body}>` : `[${body}]`
}

function formatTypeHint(zodType: z.ZodType<any> | undefined, booleanIsFlag: boolean) {
	if (!zodType) return ''
	const t = isZodOptional(zodType) ? zodType._def.innerType : zodType
	const isArray = isZodArray(t)
	const at = isArray ? t.element : t
	const typeName = isZodString(at) ? 'string' : isZodNumber(at) ? 'number' : isZodBoolean(at) ? 'boolean' : ''
	if (isArray) return typeName ? `=${typeName}...` : '...'
	if (!typeName || (booleanIsFlag && typeName === 'boolean')) return ''
	return `=${typeName}`
}

function formatDescription(value: cli.Command.Options.Entry, conflicts: string[]) {
	const quoted = isDescriptor(value.type) ? typeof value.default === 'string' : value.type && isZodString(value.type)
	const d = quoted ? `'${value.default}'` : value.default
	const description = value.default ? `${value.description} (default ${d})` : value.description
	if (conflicts.length === 0) return description
	return `${description} (conflicts with ${conflicts.map((c) => (c.length === 1 ? `-${c}` : `--${c}`)).join(', ')})`
}

/**
 * The options `key` cannot be used with.
 * A conflict is enforced both ways, so it is listed on both sides even when only one declares it.
 */
function conflictsOf(key: string, options: cli.Command.Options) {
	return Object.keys(options).filter(
		(k) => k !== key && (options[key].conflicts?.includes(k) || options[k].conflicts?.includes(key))
	)
}
function generateAliasSection(command: Command) {
	if (!command.alias) return ''
	return `Alias:
  ${wrap(command.alias.join(', '))}`
}

function generateConfigSection(command: Command) {
	const type = describeConfig(command)
	if (type === undefined) return ''
	return `Config:
${type}`
}

function describeConfig(command: Command) {
	if (!command.config) return undefined
	return isZod3Type(command.config) ? toPrettyType(command.config) : describeStandardConfig(command.config)
}

/**
 * Each example as its description, then the command line indented under it, verbatim.
 */
function generateExamplesSection(command: Command) {
	if (!command.examples || command.examples.length === 0) return ''
	return `Examples:
${command.examples.map((e) => `  ${e.description}\n    ${e.command}`).join('\n')}`
}

/**
 * Describes a Standard Schema config from the JSON Schema of its input, the shape a config file is written in.
 * It is `undefined`, and the section omitted, when the vendor does not implement `~standard.jsonSchema`
 * or cannot convert this schema.
 */
function describeStandardConfig(schema: StandardSchemaV1 | StandardJSONSchemaV1): string | undefined {
	const jsonSchema = (schema as Partial<StandardJSONSchemaV1>)['~standard']?.jsonSchema
	if (!jsonSchema) return undefined
	try {
		return describeJsonSchema(jsonSchema.input({ target: 'draft-2020-12' }))
	} catch {
		return undefined
	}
}

/**
 * Renders a JSON Schema in the same form as a zod 3 config, such as `{ a: string, b?: Array<{ d: string }> }`.
 * What it does not recognize is `unknown`.
 */
function describeJsonSchema(schema: Record<string, any>): string {
	if (Array.isArray(schema.enum)) return schema.enum.map((v: unknown) => JSON.stringify(v)).join(' | ')
	if ('const' in schema) return JSON.stringify(schema.const)
	const union = schema.anyOf ?? schema.oneOf
	if (Array.isArray(union)) return union.map(describeJsonSchema).join(' | ')
	switch (schema.type) {
		case 'object': {
			const properties: Record<string, Record<string, any>> = schema.properties ?? {}
			const required: string[] = schema.required ?? []
			const entries = Object.keys(properties).map(
				(k) => `${k}${required.includes(k) ? '' : '?'}: ${describeJsonSchema(properties[k])}`
			)
			return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`
		}
		case 'array': {
			const items = schema.items && typeof schema.items === 'object' ? schema.items : {}
			if (items.type === 'object') return `Array<${describeJsonSchema(items)}>`
			return `${describeJsonSchema(items)}[]`
		}
		case 'string':
		case 'boolean':
		case 'number':
		case 'null':
			return schema.type
		case 'integer':
			return 'number'
		default:
			return 'unknown'
	}
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

/**
 * A command's help as a value: what the text help is rendered from, for `--help` under `toon` and `json`
 * (axi-native RFC section 3.7).
 *
 * It carries no data the text help does not show. A key with nothing to say is left out.
 */
export type HelpModel = {
	/**
	 * The command as it is invoked: the cli name, then each command name, such as `my-cli deploy`.
	 */
	name: string
	usage: string
	description?: string
	aliases?: string[]
	/**
	 * The sub-commands, each with its name and the first line of its description.
	 */
	commands?: HelpModel.CommandSummary[]
	arguments?: HelpModel.Argument[]
	options?: HelpModel.Option[]
	/**
	 * The type of the config, as the text help's `Config:` section shows it.
	 */
	config?: string
	examples?: { command: string; description: string }[]
	/**
	 * The options every command accepts, listed once.
	 */
	globalOptions?: HelpModel.Option[]
}

export namespace HelpModel {
	export type CommandSummary = { name: string; aliases?: string[]; description?: string }

	/**
	 * What an argument or option accepts.
	 * `type` is the descriptor's kind, or the zod type the text help names; it is left out when unknown.
	 * An array is described by its element, with `array: true`.
	 */
	export type Type = {
		type?: string
		array?: true
		min?: number
		max?: number
		pattern?: string
		values?: (string | number | boolean)[]
	}

	export type Argument = { name: string; required: boolean; description?: string } & Type

	export type Option = {
		name: string
		aliases?: string[]
		required: boolean
		default?: unknown
		description?: string
		conflicts?: string[]
	} & Type
}

/**
 * Builds the structured help of `command`.
 *
 * @param globalOptions the base command's options, listed once under `globalOptions`.
 * The root command declares them as its own, so they are left out of its `options`.
 */
export function generateHelpModel(cliName: string, command: Command, globalOptions: cli.Command.Options): HelpModel {
	const model: HelpModel = {
		name: getCommandNameChain(cliName, command).join(' '),
		usage: generateUsageSection(cliName, command).slice('Usage: '.length)
	}
	if (command.description) model.description = command.description
	if (command.alias && command.alias.length > 0) model.aliases = [...command.alias]
	if (command.commands && command.commands.length > 0) {
		model.commands = command.commands.map((c) => {
			const summary: HelpModel.CommandSummary = { name: c.name }
			if (c.alias && c.alias.length > 0) summary.aliases = [...c.alias]
			const line = c.description?.split('\n')[0]
			if (line) summary.description = line
			return summary
		})
	}
	if (command.arguments && command.arguments.length > 0) {
		model.arguments = command.arguments.map((a) => {
			const argument: HelpModel.Argument = { name: a.name, required: isRequired(a, true), ...describeType(a.type) }
			if (a.description) argument.description = a.description
			return argument
		})
	}
	const isRoot = !command.parent && !command.name
	const options = optionModels(command.options, isRoot ? Object.keys(globalOptions) : [])
	if (options.length > 0) model.options = options
	const config = describeConfig(command)
	if (config !== undefined) model.config = config
	if (command.examples && command.examples.length > 0) {
		model.examples = command.examples.map(({ command, description }) => ({ command, description }))
	}
	model.globalOptions = optionModels(globalOptions, [])
	return model
}

function optionModels(options: cli.Command.Options | undefined, exclude: string[]) {
	if (!options) return []
	return Object.keys(options)
		.filter((key) => !exclude.includes(key))
		.map((key) => {
			const entry = options[key]
			const option = { name: key } as HelpModel.Option
			const aliases = (entry.alias ?? [])
				.map((a) => (typeof a === 'string' ? a : a.hidden ? undefined : a.alias))
				.filter((a): a is string => !!a)
			if (aliases.length > 0) option.aliases = aliases
			Object.assign(option, describeType(entry.type))
			option.required = isRequired(entry, false)
			if (entry.default !== undefined) option.default = entry.default
			if (entry.description) option.description = entry.description
			const conflicts = conflictsOf(key, options)
			if (conflicts.length > 0) option.conflicts = conflicts
			return option
		})
}

/**
 * What a declaration accepts, from the same data the text help reads:
 * a descriptor's introspection form, or the zod types `formatTypeHint()` names.
 */
function describeType(type: cli.Command.Type | undefined): HelpModel.Type {
	if (!type) return {}
	if (isDescriptor(type)) return describeData(type)
	const t = isZodOptional(type) ? type._def.innerType : type
	const isArray = isZodArray(t)
	const at = isArray ? t.element : t
	const typeName = isZodString(at) ? 'string' : isZodNumber(at) ? 'number' : isZodBoolean(at) ? 'boolean' : undefined
	const result: HelpModel.Type = {}
	if (typeName) result.type = typeName
	if (isArray) result.array = true
	return result
}

function describeData(data: DescriptorData): HelpModel.Type {
	switch (data.kind) {
		case 'string':
			return data.pattern ? { type: 'string', pattern: String(data.pattern) } : { type: 'string' }
		case 'number':
		case 'int': {
			const result: HelpModel.Type = { type: data.kind }
			if (data.min !== undefined) result.min = data.min
			if (data.max !== undefined) result.max = data.max
			return result
		}
		case 'literal':
			return { type: 'literal', values: [data.value] }
		case 'enum':
			return { type: 'enum', values: [...data.values] }
		case 'array':
			return { ...describeData(data.element), array: true }
		default:
			return { type: data.kind }
	}
}
