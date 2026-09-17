import { command } from '../../command/define.js'
import {
	formatOption,
	type OutputFormat,
	type OutputUI,
	reportProse,
	toonArray,
	toonHelp,
	toonTable
} from '../../render/format.js'
import { z } from '../../zod.js'
import { searchByKeywords } from './npm.js'

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
