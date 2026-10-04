function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cell(value: unknown): string {
	return value === undefined ? '' : String(value)
}

function table(rows: Record<string, unknown>[]): string[] {
	const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
	const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => cell(row[column]).length)))
	const line = (values: string[]) =>
		`  ${values.map((value, index) => value.padEnd(widths[index] as number)).join('  ')}`.trimEnd()
	return [line(columns), ...rows.map((row) => line(columns.map((column) => cell(row[column]))))]
}

/**
 * Renders a result for a person, not an agent: each key on its own line, a list of records as an
 * aligned table under its key, a list of values as bullets, and an empty list as `(none)`.
 */
export function renderText(value: object): string {
	const blocks = Object.entries(value).map(([key, item]) => {
		if (!Array.isArray(item)) return [`${key}: ${isRecord(item) ? JSON.stringify(item) : String(item)}`]
		if (!item.length) return [`${key}: (none)`]
		const body = item.every(isRecord) ? table(item) : item.map((entry) => `  - ${String(entry)}`)
		return [`${key}:`, ...body]
	})

	// Blank line between blocks so a following scalar doesn't read as another row of the table
	// above it.
	return blocks
		.flatMap((block, index) => {
			const previous = blocks[index - 1]
			return previous && (previous.length > 1 || block.length > 1) ? ['', ...block] : block
		})
		.join('\n')
}
