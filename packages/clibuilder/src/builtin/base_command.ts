import { command } from '../command/define.js'
import { z } from '../zod.js'

/**
 * @param options.config whether the cli accepts configuration.
 * `--show-config` is only offered when it does, so a cli without config
 * does not advertise an option that could never do anything.
 */
export function getBaseCommand(description: string, options?: { config?: boolean }) {
	return command({
		name: '',
		description,
		options: {
			help: {
				type: z.optional(z.boolean()),
				description: 'Print help message',
				alias: ['h']
			},
			version: {
				type: z.optional(z.boolean()),
				description: 'Print the CLI version',
				alias: ['v']
			},
			verbose: {
				type: z.optional(z.boolean()),
				description: 'Turn on verbose logging',
				alias: ['V']
			},
			silent: {
				type: z.optional(z.boolean()),
				description: 'Turn off logging'
			},
			'debug-cli': {
				type: z.optional(z.boolean()),
				description: 'Display clibuilder debug messages'
			},
			...(options?.config
				? {
						'show-config': {
							type: z.optional(z.boolean()),
							description: 'Print the resolved config and where it was loaded from'
						}
					}
				: {})
		},
		commands: []
	})
}
