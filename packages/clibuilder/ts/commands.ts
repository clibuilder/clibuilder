import { findByKeywords } from 'find-installed-packages'
import { searchByKeywords } from 'search-packages'
import { command } from './command.js'
import { z } from './zod.js'

export function getBaseCommand(description: string) {
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
			}
		},
		commands: [],
		run() {
			this.ui.showHelp()
		}
	})
}

// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
// istanbul ignore next
export const listPluginsCommand = command({
	name: 'list',
	alias: ['ls'],
	description: 'List installed plugins',
	context: { findByKeywords },
	async run() {
		const plugins = await this.context.findByKeywords(this.keywords, this)
		if (plugins.length === 0) {
			this.ui.info(`no plugin with keywords: ${this.keywords.join(', ')}`)
			return []
		}
		if (plugins.length === 1) {
			this.ui.info(`found one plugin: ${plugins[0]}`)
			return plugins
		}
		this.ui.info('found the following plugins:')
		this.ui.info('')
		plugins.forEach((p) => this.ui.info(`  ${p}`))
		return plugins
	}
})

export const searchPluginsCommand = command({
	name: 'search',
	description: 'Search only for available plugins',
	context: { searchByKeywords },
	async run() {
		const packages = await this.context.searchByKeywords(this.keywords)
		if (packages.length === 0) {
			this.ui.info(`no package with keywords: ${this.keywords.join(', ')}`)
		} else if (packages.length === 1) {
			this.ui.info(`found one package: ${packages[0]}`)
		} else {
			this.ui.info('found the following packages:')
			this.ui.info('')
			packages.forEach((p) => this.ui.info(`  ${p}`))
		}
	}
})

export const pluginsCommand = command({
	name: 'plugins',
	description: 'Commands related to the plugins of the cli',
	commands: [listPluginsCommand, searchPluginsCommand]
})
