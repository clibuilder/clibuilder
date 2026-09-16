import { command } from '../../command.js'
import { formatOption, type OutputFormat, type OutputUI, reportProse, toonArray, toonHelp } from '../../output.js'
import { findByKeywords } from './npm.js'

export const listPluginsCommand = command({
	name: 'list',
	alias: ['ls'],
	description: 'List installed plugins',
	options: { format: formatOption },
	context: { findByKeywords },
	async run(args) {
		const plugins = await this.context.findByKeywords(this.keywords, this)
		reportPlugins(this.ui, args.format, plugins, this.keywords)
		// the found names are the command's return value as well as its output: a cli
		// embedding `plugins list` reads them from here rather than parsing the report.
		return plugins
	}
})

/**
 * Renders the installed plugins in the caller's chosen format.
 *
 * `toon` and `json` report the same shape whatever the count — a list of one is still a
 * list — so a reader can parse the output without branching on how many there turned out
 * to be. Only `text` keeps the count-dependent prose, because that is what makes it read
 * as English.
 */
function reportPlugins(ui: OutputUI, format: OutputFormat | undefined, plugins: string[], keywords: string[]) {
	if (format === 'json') {
		// no help line here — a `| jq` consumer wants the payload and nothing else.
		ui.info(JSON.stringify({ plugins }, undefined, 2))
		return
	}
	if (format === 'text') {
		reportProse(ui, { noun: 'plugin', plural: 'plugins' }, plugins, (p) => p, keywords)
		return
	}
	if (plugins.length === 0) {
		// "installed" carries the whole difference between this zero and `search`'s: nothing
		// is installed here, which says nothing about what exists on npm. The next step
		// follows from that — go look there.
		ui.info(`plugins: 0 installed plugins found with keywords: ${keywords.join(', ')}`)
		ui.info(toonHelp('Run `plugins search` to find plugins to install'))
		return
	}
	ui.info(toonArray('plugins', plugins))
	ui.info(toonHelp('Run `plugins search` to find more plugins on npm'))
}
