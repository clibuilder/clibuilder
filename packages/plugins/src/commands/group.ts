import { command } from 'clibuilder'
import { listPluginsCommand } from './list.js'
import { searchPluginsCommand } from './search.js'

export namespace pluginsCommand {
	export type Options = {
		/**
		 * The npm keywords `plugins list` and `plugins search` look for.
		 */
		keywords: string[]
	}
}

/**
 * The `plugins` command group: `plugins list` and `plugins search`.
 *
 * For a host that wants the commands without the plugin loading `plugins()` does.
 */
export function pluginsCommand({ keywords }: pluginsCommand.Options) {
	return command({
		name: 'plugins',
		description: 'Commands related to the plugins of the cli',
		commands: [listPluginsCommand(keywords), searchPluginsCommand(keywords)]
	})
}
