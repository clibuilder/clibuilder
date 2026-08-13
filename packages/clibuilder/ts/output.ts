import { z } from './zod.js'

/**
 * How a command renders a collection it reports.
 *
 * `toon` is the default everywhere because a cli's own metadata — which plugins are
 * installed, which are published — is read by an agent far more often than by a person,
 * and toon is the cheaper read for one. It is a default, not the only option: `text` is
 * the prose a human wants, and `json` is what survives a pipe into `jq`.
 */
export type OutputFormat = 'toon' | 'text' | 'json'

/**
 * The `--format` option, declared once so every command that reports a collection
 * offers the same three values, the same wording, and the same default.
 */
export const formatOption = {
	type: z.optional(z.enum(['toon', 'text', 'json'])),
	description: "Output format: 'toon' for agents, 'text' for humans, 'json' to pipe",
	default: 'toon' as const
}

/**
 * Minimal `ui` surface these helpers need, so they can be handed a command's `ui`
 * without dragging its whole type in.
 */
export type OutputUI = { info(...args: any[]): void }

/**
 * Quotes a toon value when it would otherwise be ambiguous.
 *
 * Package names have no reason to contain a comma, a quote, or a backslash, but neither
 * the registry nor the local dependency tree is ours to trust: an unquoted one would read
 * as two entries to whoever parses the output. `JSON.stringify` does the escaping, since
 * toon strings escape the same way json ones do — hand-rolling it drops the backslash
 * case, which is worse than not quoting at all (a trailing `\` would escape the closing
 * quote).
 */
export function toonValue(value: string) {
	return /["\\,]|^\s|\s$/.test(value) ? JSON.stringify(value) : value
}

/**
 * A toon array of scalars on one line: `name[2]: a,b`.
 *
 * The length is part of the syntax, so the reader never has to count the entries or
 * wonder whether the list was truncated.
 */
export function toonArray(name: string, values: string[]) {
	return `${name}[${values.length}]: ${values.map(toonValue).join(',')}`
}

/**
 * A toon table: a header naming the columns, then one indented row per entry.
 *
 * Worth a row per entry only when there is a second column to carry; a single-column
 * table says the same thing as {@link toonArray} for more tokens.
 */
export function toonTable(name: string, columns: string[], rows: string[][]) {
	return [`${name}[${rows.length}]{${columns.join(',')}}:`, ...rows.map((r) => `  ${r.map(toonValue).join(',')}`)]
}

/**
 * The contextual-disclosure line: what the caller can usefully run next.
 *
 * Counted like every other toon array so a reader can tell one suggestion from several
 * without parsing them.
 */
export function toonHelp(suggestion: string) {
	return `help[1]: ${suggestion}`
}

/**
 * The human-readable rendering of a found collection, in the three counts prose needs:
 * none, exactly one, and several.
 *
 * `noun`/`plural` are the only thing that varies between the commands that report one,
 * which is what keeps `--format text` reading as one voice across them.
 */
export function reportProse<T>(
	ui: OutputUI,
	{ noun, plural }: { noun: string; plural: string },
	items: T[],
	describe: (item: T) => string,
	keywords: string[]
) {
	if (items.length === 0) {
		ui.info(`no ${noun} with keywords: ${keywords.join(', ')}`)
		return
	}
	if (items.length === 1) {
		ui.info(`found one ${noun}: ${describe(items[0]!)}`)
		return
	}
	ui.info(`found the following ${plural}:`)
	ui.info('')
	items.forEach((item) => {
		ui.info(`  ${describe(item)}`)
	})
}
