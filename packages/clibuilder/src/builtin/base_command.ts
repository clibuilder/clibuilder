import type { cli } from '../cli.js'
import { command } from '../command/define.js'
import { lookupOptions } from '../invocation/lookup.js'
import { formats } from '../render/encode.js'
import { t } from '../t.js'

// tells the base command's global `--format` apart from a command's own `format` option
const globalFormat = Symbol.for('clibuilder.global-format')

/**
 * Marks a command's own `format` option that gives way to the global `--format`:
 * the option is dropped and `run()` reads `this.format`.
 * A `Symbol.for` key, so a copy of `@clibuilder/plugins` built against another clibuilder still matches.
 */
export const defersToGlobalFormat = Symbol.for('clibuilder.defers-to-global-format')

/** `options.options` are the global options extensions added; they are listed before `--format`. */
export function getBaseCommand(
	description: string,
	options?: { format?: cli.Format | undefined; options?: cli.Command.Options | undefined }
) {
	return command({
		name: '',
		description,
		options: {
			help: {
				type: t.boolean().optional(),
				description: 'Print help message',
				alias: ['h']
			},
			version: {
				type: t.boolean().optional(),
				description: 'Print the CLI version',
				alias: ['v']
			},
			verbose: {
				type: t.boolean().optional(),
				description: 'Turn on verbose logging',
				alias: ['V']
			},
			silent: {
				type: t.boolean().optional(),
				description: 'Turn off logging'
			},
			'debug-cli': {
				type: t.boolean().optional(),
				description: 'Display clibuilder debug messages'
			},
			...options?.options,
			format: formatEntry(options?.format ?? 'toon')
		},
		commands: []
	})
}

// no `-f` alias: it is commonly a command's own `--force` or `--file` (axi-native RFC section 3.4)
function formatEntry(defaultFormat: cli.Format) {
	return Object.defineProperty(
		{
			type: t.enum(formats as [cli.Format, ...cli.Format[]]),
			description: "Output format: 'toon' for agents, 'json' to pipe, 'text' for humans",
			default: defaultFormat
		},
		globalFormat,
		{ value: true }
	)
}

export function isGlobalFormatEntry(entry: cli.Command.Options.Entry | undefined) {
	return !!entry && (entry as any)[globalFormat] === true
}

/**
 * Drops, on a copy, a command's own `format` option that defers to the global `--format`.
 * Any other is a startup error: two options named `format` would shadow each other
 * (axi-native RFC section 3.4).
 */
export function yieldToGlobalFormat<C extends cli.Command>(command: C): C {
	const [name, entry] = lookupOptions(command, 'format')
	if (!name || isGlobalFormatEntry(entry)) return command
	if (!(entry as any)[defersToGlobalFormat]) {
		const label = command.name ? `command '${command.name}'` : 'the default command'
		throw new Error(
			`${label} declares its own option '${name}', which conflicts with the global --format option. ` +
				'Delete the local declaration and read this.format in run() instead. ' +
				'See docs/rfcs/axi-native.md section 3.4: ' +
				'https://github.com/clibuilder/clibuilder/blob/main/docs/rfcs/axi-native.md#34---format-is-not-first-class-6394'
		)
	}
	const { [name]: _, ...options } = command.options!
	return { ...command, options }
}
