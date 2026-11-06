import { CliError, type HelpLine, ref, t } from 'clibuilder'

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
 *
 * It gives way to clibuilder's global `--format` when that is active (under `output: 'axi'`
 * or when `cli({ format })` is set): clibuilder drops the option from the command, and `run()`
 * reads `this.format` instead. The marker is a `Symbol.for` key, so it matches any copy of clibuilder,
 * and a clibuilder without the global option ignores it.
 */
export const formatOption = Object.defineProperty(
	{
		type: t.enum(['toon', 'text', 'json']).optional(),
		description: "Output format: 'toon' for agents, 'text' for humans, 'json' to pipe",
		default: 'toon' as const
	},
	Symbol.for('clibuilder.defers-to-global-format'),
	{ value: true }
)

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
	nouns: { noun: string; plural: string },
	items: T[],
	describe: (item: T) => string,
	keywords: string[]
) {
	proseLines(nouns, items, describe, keywords).forEach((line) => {
		ui.info(line)
	})
}

/**
 * The lines of {@link reportProse}, for a command that returns its report instead of logging it.
 */
export function proseLines<T>(
	{ noun, plural }: { noun: string; plural: string },
	items: T[],
	describe: (item: T) => string,
	keywords: string[]
) {
	if (items.length === 0) return [`no ${noun} with keywords: ${keywords.join(', ')}`]
	if (items.length === 1) return [`found one ${noun}: ${describe(items[0]!)}`]
	return [`found the following ${plural}:`, '', ...items.map((item) => `  ${describe(item)}`)]
}

/**
 * How many entries `plugins list` and `plugins search` show before they cut the list (AXI rules 3 and 4).
 */
export const listLimit = 20

/**
 * The `--full` option: shows every entry instead of the first {@link listLimit}.
 */
export const fullOption = {
	type: t.boolean().optional(),
	description: `Show every entry instead of the first ${listLimit}`
}

/**
 * Keeps the first {@link listLimit} items unless `full` is set.
 * `count` reads `20 of 847 total`, and is set only when something was cut.
 */
export function truncate<T>(items: readonly T[], full?: boolean | undefined) {
	if (full || items.length <= listLimit) return { items: [...items], count: undefined }
	return { items: items.slice(0, listLimit), count: `${listLimit} of ${items.length} total` }
}

/**
 * The parts of a running command these helpers read: its name, and the parent clibuilder links it to.
 */
export type CommandNode = { name: string; parent?: CommandNode | undefined; commands?: CommandNode[] | undefined }

/**
 * A ref to `name`, a sibling of `command` in the command tree, such as `plugins search` from `plugins list`.
 *
 * The path comes from where the command is mounted, so the ref stays valid when a host nests the `plugins` group.
 * It is `undefined` when the sibling is not there, such as for `plugins list` added on its own:
 * a next step that would fail is not offered (AXI change 3).
 */
export function siblingRef(command: unknown, name: string, options: Record<string, unknown>, why: string) {
	const parent = (command as CommandNode).parent
	if (!parent?.commands?.some((c) => c.name === name)) return undefined
	return ref([...commandPath(parent), name].join(' '), options, why)
}

/**
 * A ref to `command` itself, with `options`, such as `plugins search --full`.
 */
export function selfRef(command: unknown, options: Record<string, unknown>, why: string) {
	const path = commandPath(command as CommandNode)
	return path.length > 0 ? ref(path.join(' '), options, why) : undefined
}

function commandPath(command: CommandNode) {
	const names: string[] = []
	for (let c: CommandNode | undefined = command; c; c = c.parent) if (c.name) names.unshift(c.name)
	return names
}

/**
 * The help lines that are set, in order.
 */
export function helpLines(...lines: Array<HelpLine | undefined>): HelpLine[] {
	return lines.filter((l): l is HelpLine => l !== undefined)
}

/**
 * A failed registry search as a `CliError`, so it is reported in the caller's format instead of crashing.
 */
export function searchFailed(error: unknown, retry: HelpLine | undefined) {
	const reason = error instanceof Error ? error.message : String(error)
	return new CliError(`cannot search the npm registry: ${reason}`, {
		code: 'registry-search-failed',
		help: helpLines('Check that the npm registry is reachable', retry)
	})
}
