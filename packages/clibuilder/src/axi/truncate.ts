/** The number of characters {@link truncateText} keeps by default. */
export const defaultTextLimit = 500

/**
 * Cuts a long text down to `limit` characters and says how much there was:
 * `... (truncated, 8432 chars total)` on a line of its own. Nothing is cut when `full` is set, such as
 * from the parsed `--full`, or the text already fits.
 *
 * `truncated` tells the command to suggest the way back, such as ``Run `my-cli show 42 --full` ``.
 */
export function truncateText(text: string, options: truncateText.Options = {}): truncateText.Result {
	const limit = options.limit ?? defaultTextLimit
	if (options.full || text.length <= limit) return { text, truncated: false }
	return { text: `${text.slice(0, limit)}\n... (truncated, ${text.length} chars total)`, truncated: true }
}

export namespace truncateText {
	export type Options = {
		/** Characters to keep. Defaults to {@link defaultTextLimit}. */
		limit?: number | undefined
		/** Skips truncation, such as from the parsed `--full`. */
		full?: boolean | undefined
	}
	export type Result = { text: string; truncated: boolean }
}

/**
 * Keeps the first `limit` items and counts the rest, so the reader knows whether it saw everything
 * without another call.
 *
 * `count` reads `30 of 847 total`. The kept list's own length (`items[30]` in TOON) stays the
 * number of rows shown, so a header never claims rows that are not there.
 */
export function truncateList<T>(items: readonly T[], options: truncateList.Options): truncateList.Result<T> {
	const total = items.length
	const kept = options.full ? [...items] : items.slice(0, options.limit)
	return { items: kept, count: `${kept.length} of ${total} total`, total, truncated: kept.length < total }
}

export namespace truncateList {
	export type Options = {
		/** Items to keep. */
		limit: number
		/** Skips truncation, such as from the parsed `--full`. */
		full?: boolean | undefined
	}
	export type Result<T> = {
		items: T[]
		/** `30 of 847 total`. */
		count: string
		total: number
		truncated: boolean
	}
}

/**
 * Says the zero instead of printing an empty list: `tasks: 0 open tasks found in this repository`
 * reads as a definite answer, where `tasks[0]:` or a blank line reads as a possible failure.
 *
 * @example
 * ```ts
 * return result({ tasks: orEmpty(tasks, '0 open tasks found in this repository') })
 * ```
 */
export function orEmpty<T>(items: readonly T[], message: string): readonly T[] | string {
	return items.length === 0 ? message : items
}
