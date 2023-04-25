import type { RequiredPick } from 'type-plus'
import type { cli, DisplayLevel } from './cli.js'
import { getBaseCommand } from './commands.js'
import type { Command } from './types.internal.js'

export namespace state {
	export type Result = {
		name: string
		version: string
		description: string
		configName?: string
		config?: any
		keywords: string[]
		displayLevel: DisplayLevel
		command: RequiredPick<Command, 'commands'>
	}
}

export function state(options: cli.Options): state.Result {
	const { name, description = '', version, config, keywords = [] } = options
	if (config && keywords.length === 0) keywords.push(name)
	const configName = typeof config === 'string' ? config : config ? name : undefined
	return {
		name,
		description,
		version,
		configName,
		keywords,
		displayLevel: 'info',
		command: getBaseCommand(description) as any
	}
}
