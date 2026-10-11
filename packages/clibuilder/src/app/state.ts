import { getBaseCommand } from '../builtin/base_command.js'
import type { cli } from '../cli.js'
import type { Command } from '../command/internal.js'
import type { DisplayLevel } from '../core/ports.js'
import type { RequiredPick } from '../type_utils.js'

export namespace state {
	export type Result = {
		name: string
		version: string
		description: string
		configName?: string
		config?: any
		displayLevel: DisplayLevel
		/**
		 * The cli's default format while the global `--format` is active
		 * (under `output: 'axi'` or when `cli({ format })` is set), else `undefined`.
		 */
		globalFormat: cli.Format | undefined
		command: RequiredPick<Command, 'commands'>
	}
}

export function state(options: cli.Options): state.Result {
	const { name, description = '', version, config } = options
	const configName = typeof config === 'string' ? config : config ? name : undefined
	const globalFormat = globalFormatOf(options)
	return {
		name,
		description,
		version,
		configName,
		displayLevel: 'info',
		globalFormat,
		command: getBaseCommand(description, { config: !!configName, format: globalFormat }) as any
	}
}

/**
 * The cli's default format when the global `--format` is active, else `undefined`.
 *
 * It is active under `output: 'axi'` or when `cli({ format })` is set, so a v11 cli in the default
 * `console` output with no `cli({ format })` declares no `--format` and behaves as before
 * (axi-native RFC section 6, step 6).
 */
export function globalFormatOf(options: Pick<cli.Options, 'output' | 'format'>): cli.Format | undefined {
	if (options.format !== undefined) return options.format
	return options.output === 'axi' ? 'toon' : undefined
}
