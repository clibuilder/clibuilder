import type { cli } from '../cli.js'
import { command } from '../command/define.js'
import { lookupOptions } from '../invocation/lookup.js'
import { formats } from '../render/encode.js'
import { t } from '../t.js'

/**
 * Marks the global `--format` entry of the base command,
 * so it is told apart from a command's own option named `format`.
 */
const globalFormat = Symbol.for('clibuilder.global-format')

/**
 * Marks a command's own `format` option that gives way to the global `--format` when it is active:
 * the option is dropped from the command and `run()` reads `this.format`.
 * The `plugins` commands of `@clibuilder/plugins` carry it.
 * It is a `Symbol.for` key so a copy of `@clibuilder/plugins` built against another copy of clibuilder still matches.
 */
export const defersToGlobalFormat = Symbol.for('clibuilder.defers-to-global-format')

/**
 * @param options.config whether the cli accepts configuration.
 * `--show-config` is only offered when it does, so a cli without config
 * does not advertise an option that could never do anything.
 * @param options.format the cli's default format when the global `--format` is active:
 * under `output: 'axi'` or when `cli({ format })` is set.
 * Without it, the base command declares no `--format`, as in clibuilder 11.5.
 */
export function getBaseCommand(description: string, options?: { config?: boolean; format?: cli.Format | undefined }) {
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
			...(options?.config
				? {
						'show-config': {
							type: t.boolean().optional(),
							description: 'Print the resolved config and where it was loaded from'
						}
					}
				: {}),
			...(options?.format ? { format: formatEntry(options.format) } : {})
		},
		commands: []
	})
}

/**
 * The global `--format` entry. No `-f` alias: it is commonly a command's own `--force` or `--file`
 * (axi-native RFC section 3.4).
 */
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

/**
 * Whether `entry` is the global `--format` declared by the base command.
 */
export function isGlobalFormatEntry(entry: cli.Command.Options.Entry | undefined) {
	return !!entry && (entry as any)[globalFormat] === true
}

/**
 * Checks a command's own `format` option against the global `--format` while it is active.
 *
 * An option that defers to the global one is dropped, on a copy, so `run()` reads `this.format`.
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
