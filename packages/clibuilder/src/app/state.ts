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
		config?: any
		displayLevel: DisplayLevel
		command: RequiredPick<Command, 'commands'>
	}
}

export function state(options: cli.Options): state.Result {
	const { name, description = '', version } = options
	return {
		name,
		description,
		version,
		displayLevel: 'info',
		command: getBaseCommand(description, { format: options.format }) as any
	}
}
