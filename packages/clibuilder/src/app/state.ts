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
		command: RequiredPick<Command, 'commands'>
	}
}

export function state(options: cli.Options): state.Result {
	const { name, description = '', version, config } = options
	const configName = typeof config === 'string' ? config : config ? name : undefined
	return {
		name,
		description,
		version,
		configName,
		displayLevel: 'info',
		command: getBaseCommand(description, { config: !!configName, format: options.format }) as any
	}
}
