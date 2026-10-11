/**
 * Wraps `text` at `width` columns, breaking only between words.
 *
 * A word longer than `width` stays whole on its own line.
 * Spaces at the end of a broken line and at the start of the next one are dropped,
 * a tab counts as four spaces, and a newline in `text` starts a new line.
 */
export function wrap(text: string, width: number) {
	const lines = ['']
	for (const raw of text.split(/(\S+\s+)/)) {
		if (raw === '') continue
		const chunk = raw.replace(/\t/g, '    ')
		const i = lines.length - 1
		if (lines[i]!.length + chunk.length > width) {
			lines[i] = lines[i]!.replace(/\s+$/, '')
			for (const c of chunk.split('\n')) lines.push(c.replace(/^\s+/, ''))
		} else if (chunk.includes('\n')) {
			const [first, ...rest] = chunk.split('\n')
			lines[i] += first
			for (const c of rest) lines.push(c.replace(/^\s+/, ''))
		} else {
			lines[i] += chunk
		}
	}
	return lines.join('\n')
}
