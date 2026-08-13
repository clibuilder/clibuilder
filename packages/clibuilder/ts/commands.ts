import { command } from './command.js'
import {
	formatOption,
	type OutputFormat,
	type OutputUI,
	reportProse,
	toonArray,
	toonHelp,
	toonTable
} from './output.js'
import { z } from './zod.js'

// `find-installed-packages` and `search-packages` are only needed by `plugins list` and
// `plugins search`, yet `commands.ts` sits on the startup path of every CLI invocation.
// Loading them lazily keeps ~16ms of module init off that path.
// They stay in `context` so tests can still substitute a fake.
const findByKeywords: typeof import('find-installed-packages').findByKeywords = async (...args) =>
	(await import('find-installed-packages')).findByKeywords(...args)

// ignoring coverage. Reaching this shim means querying the npm registry for real,
// so every test substitutes `context.searchByKeywords` instead.
// istanbul ignore next
const searchByKeywords: typeof import('search-packages').searchByKeywords = async (...args: any[]): Promise<any> =>
	(await import('search-packages')).searchByKeywords(...(args as [string[]]))

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
		commands: [],
		run() {
			this.ui.showHelp()
		}
	})
}

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

export const searchPluginsCommand = command({
	name: 'search',
	description: 'Search only for available plugins',
	options: {
		format: formatOption,
		fields: {
			type: z.optional(z.string()),
			description: "Extra fields to report, comma separated. Only 'keywords' is available"
		}
	},
	context: { searchByKeywords },
	async run(args) {
		const fields = parseFields(args.fields)
		if (!fields) {
			this.ui.info(`error: unknown value for --fields: ${args.fields}`)
			this.ui.info(toonHelp('The only extra field is `keywords`. Run `plugins search --fields keywords`'))
			return
		}
		// `searchByKeywords` matches packages carrying *all* of the keywords it is given.
		// A cli declaring several keywords wants a package matching *any* of them, so query
		// one keyword at a time and union the results, first-seen order wins.
		const found = await Promise.all(this.keywords.map((keyword) => this.context.searchByKeywords([keyword])))
		// a `Map` keyed by name is the union and the provenance in one pass: insertion order is
		// first-seen order, and a package matched by a later keyword appends rather than repeats.
		const packages = new Map<string, string[]>()
		found.forEach((names, i) => {
			names.forEach((name) => {
				const matched = packages.get(name)
				if (matched) matched.push(this.keywords[i]!)
				else packages.set(name, [this.keywords[i]!])
			})
		})
		reportPackages(this.ui, args.format, fields, [...packages].map(toPackage), this.keywords)
	}
})

type FoundPackage = { name: string; keywords: string[] }

function toPackage([name, keywords]: [string, string[]]): FoundPackage {
	return { name, keywords }
}

/**
 * Reads `--fields` into the set of extra columns to report.
 *
 * `name` is not one of them: it is the row's identity, so it is always present and
 * naming it is accepted as a no-op rather than rejected. Returns `undefined` for an
 * unrecognized field, which the caller reports — silently dropping it would hand back a
 * narrower result than was asked for, which AXI treats as worse than an error.
 */
function parseFields(fields: string | undefined) {
	if (fields === undefined) return { keywords: false }
	const requested = fields.split(',').map((f) => f.trim())
	if (requested.some((f) => f !== 'keywords' && f !== 'name')) return undefined
	return { keywords: requested.includes('keywords') }
}

/**
 * Renders the search result in the caller's chosen format.
 *
 * The empty state names the keywords rather than printing an empty array: an agent that
 * reads `packages[0]:` tends to retry with different flags to make sure it did not just
 * filter the answer away.
 */
function reportPackages(
	ui: OutputUI,
	format: OutputFormat | undefined,
	fields: { keywords: boolean },
	packages: FoundPackage[],
	keywords: string[]
) {
	if (format === 'json') {
		// no help line here — a `| jq` consumer wants the payload and nothing else.
		const payload = fields.keywords ? packages : packages.map((p) => p.name)
		ui.info(JSON.stringify({ packages: payload }, undefined, 2))
		return
	}
	if (format === 'text') {
		const describe = (p: FoundPackage) => (fields.keywords ? `${p.name} (${p.keywords.join(', ')})` : p.name)
		reportProse(ui, { noun: 'package', plural: 'packages' }, packages, describe, keywords)
		return
	}
	if (packages.length === 0) {
		ui.info(`packages: 0 packages found with keywords: ${keywords.join(', ')}`)
		return
	}
	if (fields.keywords) {
		// tabular toon: the extra column is worth a row per package, where the flat form is not.
		// the cell joins on a space because comma is the field delimiter.
		const rows = packages.map((p) => [p.name, p.keywords.join(' ')])
		toonTable('packages', ['name', 'keywords'], rows).forEach((line) => {
			ui.info(line)
		})
	} else {
		ui.info(toonArray('packages', packages.map((p) => p.name)))
	}
	ui.info(toonHelp('Run `plugins list` to see which of them are installed'))
}

export const pluginsCommand = command({
	name: 'plugins',
	description: 'Commands related to the plugins of the cli',
	commands: [listPluginsCommand, searchPluginsCommand]
})
