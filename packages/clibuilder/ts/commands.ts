import { command } from './command.js'
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
		plugins.forEach((p) => {
			this.ui.info(`  ${p}`)
		})
		return plugins
	}
})

export const searchPluginsCommand = command({
	name: 'search',
	description: 'Search only for available plugins',
	options: {
		format: {
			type: z.optional(z.enum(['toon', 'text', 'json'])),
			description: "Output format: 'toon' for agents, 'text' for humans, 'json' to pipe",
			default: 'toon' as const
		},
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
			this.ui.info('help[1]: The only extra field is `keywords`. Run `plugins search --fields keywords`')
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
 * `toon` is the default because a cli's plugin search is read by an agent far more often
 * than by a person, and toon is the cheaper read for one. It is a default, not the only
 * option: `text` is the prose a human wants, and `json` is what survives a pipe.
 */
function reportPackages(
	ui: { info(...args: any[]): void },
	format: 'toon' | 'text' | 'json' | undefined,
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
		if (packages.length === 0) {
			ui.info(`no package with keywords: ${keywords.join(', ')}`)
			return
		}
		const describe = (p: FoundPackage) => (fields.keywords ? `${p.name} (${p.keywords.join(', ')})` : p.name)
		if (packages.length === 1) {
			ui.info(`found one package: ${describe(packages[0]!)}`)
			return
		}
		ui.info('found the following packages:')
		ui.info('')
		packages.forEach((p) => {
			ui.info(`  ${describe(p)}`)
		})
		return
	}
	if (packages.length === 0) {
		ui.info(`packages: 0 packages found with keywords: ${keywords.join(', ')}`)
		return
	}
	if (fields.keywords) {
		// tabular toon: the extra column is worth a row per package, where the flat form is not.
		// the cell joins on a space because comma is the field delimiter.
		ui.info(`packages[${packages.length}]{name,keywords}:`)
		packages.forEach((p) => {
			ui.info(`  ${toonValue(p.name)},${toonValue(p.keywords.join(' '))}`)
		})
	} else {
		ui.info(`packages[${packages.length}]: ${packages.map((p) => toonValue(p.name)).join(',')}`)
	}
	ui.info('help[1]: Run `plugins list` to see which of them are installed')
}

/**
 * Quotes a toon value when it would otherwise be ambiguous.
 *
 * Package names have no reason to contain a comma, a quote, or a backslash, but the
 * registry is not ours to trust: an unquoted one would read as two entries to whoever
 * parses the output. `JSON.stringify` does the escaping, since toon strings escape the
 * same way json ones do — hand-rolling it drops the backslash case, which is worse than
 * not quoting at all (a trailing `\` would escape the closing quote).
 */
function toonValue(value: string) {
	return /["\\,]|^\s|\s$/.test(value) ? JSON.stringify(value) : value
}

export const pluginsCommand = command({
	name: 'plugins',
	description: 'Commands related to the plugins of the cli',
	commands: [listPluginsCommand, searchPluginsCommand]
})
