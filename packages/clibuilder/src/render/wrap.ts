/**
 * Wraps `text` at `width` columns, breaking only between words; a longer word stays whole.
 * A tab counts as four spaces.
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
