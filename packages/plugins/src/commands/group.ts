import { CliError, type cli, command, exitCodes, result } from 'clibuilder'
import { type CommandNode, helpLines, siblingRef, truncate } from './format.js'
import { listPluginsCommand } from './list.js'
import { findByKeywords } from './npm.js'
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
 *
 * Invoked bare under `output: 'axi'`, it answers with the installed plugins followed by its own commands
 * (AXI change 2). A host that adds sub-commands to a copy of the group gets them listed too.
 */
export function pluginsCommand({ keywords }: pluginsCommand.Options): cli.Command {
	return command({
		name: 'plugins',
		description: 'Commands related to the plugins of the cli',
		commands: [listPluginsCommand(keywords), searchPluginsCommand(keywords)],
		context: { findByKeywords },
		async run() {
			// `output: 'console'` keeps the 0.2 behavior: a bare group prints its help and exits 2
			if (this.output !== 'axi') {
				this.ui.showHelp()
				throw CliError.reported(exitCodes.usage)
			}
			const plugins = await this.context.findByKeywords(keywords, this)
			const commands = ((this as unknown as CommandNode).commands ?? []).map((c) => c.name)
			if (plugins.length === 0) {
				return result(
					{ plugins: `0 installed plugins found with keywords: ${keywords.join(', ')}`, commands },
					{ help: helpLines(childRef(this, 'search', {}, 'find plugins to install')) }
				)
			}
			const shown = truncate(plugins)
			return result(
				{ plugins: shown.items, ...(shown.count ? { count: shown.count } : {}), commands },
				{
					help: helpLines(
						shown.count ? childRef(this, 'list', { full: true }, 'list every installed plugin') : undefined
					)
				}
			)
		}
	})
}

// a ref to a sub-command of `group`, through the parent clibuilder links each sub-command to
function childRef(group: unknown, name: string, options: Record<string, unknown>, why: string) {
	const child = (group as CommandNode).commands?.[0]
	return child ? siblingRef(child, name, options, why) : undefined
}
