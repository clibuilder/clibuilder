import { command, empty, result } from 'clibuilder'
import {
	formatOption,
	fullOption,
	helpLines,
	type OutputFormat,
	type OutputUI,
	proseLines,
	reportProse,
	selfRef,
	siblingRef,
	toonArray,
	toonHelp,
	truncate
} from './format.js'
import { findByKeywords } from './npm.js'

export function listPluginsCommand(keywords: string[]) {
	return command({
		name: 'list',
		alias: ['ls'],
		description: 'List installed plugins',
		options: { format: formatOption, full: fullOption },
		context: { findByKeywords },
		async run(args) {
			const plugins = await this.context.findByKeywords(keywords, this)
			// under clibuilder's `output: 'axi'` the report is the answer: returned, and printed once on stdout by clibuilder
			if (this.output === 'axi') return answerPlugins(this, plugins, keywords, args.full)
			// `args.format` is unset when clibuilder's global `--format` is active: the local option gives way to it
			reportPlugins(this.ui, args.format ?? this.format, plugins, keywords)
			// the found names are the command's return value as well as its output: a cli
			// embedding `plugins list` reads them from here rather than parsing the report.
			return plugins
		}
	})
}

/**
 * The installed plugins as the answer under `output: 'axi'`, in the shape {@link reportPlugins} logs:
 * `plugins` with a next step, prose under `--format text`, and an explicit empty state.
 * A long list is cut to the first entries, with `count` and a `--full` next step.
 */
function answerPlugins(command: unknown, plugins: string[], keywords: string[], full: boolean | undefined) {
	if (plugins.length === 0) {
		return empty(`0 installed plugins found with keywords: ${keywords.join(', ')}`, {
			help: helpLines(siblingRef(command, 'search', {}, 'find plugins to install'))
		})
	}
	const shown = truncate(plugins, full)
	return result(
		{ plugins: shown.items, ...(shown.count ? { count: shown.count } : {}) },
		{
			help: helpLines(
				shown.count ? selfRef(command, { full: true }, 'list every installed plugin') : undefined,
				siblingRef(command, 'search', {}, 'find more plugins on npm')
			),
			render: {
				text: (v) =>
					[
						...proseLines({ noun: 'plugin', plural: 'plugins' }, v.plugins, (p) => p, keywords),
						...(v.count ? ['', `showing ${v.count}`] : [])
					].join('\n')
			}
		}
	)
}

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
