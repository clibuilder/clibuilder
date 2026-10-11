/**
 * Turns JSONC into JSON that `JSON.parse` accepts.
 * Comments, a leading BOM and trailing commas become spaces, so `JSON.parse` error positions
 * still point into the original text. Throws on an unterminated string or block comment.
 */
export function stripJsonc(text: string): string {
	const out = text.split('')
	const n = text.length
	let i = 0
	let comma = -1
	if (text.charCodeAt(0) === 0xfeff) {
		out[0] = ' '
		i = 1
	}
	const blank = (from: number, to: number) => {
		for (let k = from; k < to; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '
	}
	while (i < n) {
		const c = text[i]
		if (c === '"') {
			comma = -1
			let j = i + 1
			while (j < n && text[j] !== '"') j += text[j] === '\\' ? 2 : 1
			if (j >= n) throw new Error(`Unterminated string at offset ${i}`)
			i = j + 1
		} else if (c === '/' && text[i + 1] === '/') {
			let j = i + 2
			while (j < n && text[j] !== '\n' && text[j] !== '\r') j++
			blank(i, j)
			i = j
		} else if (c === '/' && text[i + 1] === '*') {
			const j = text.indexOf('*/', i + 2)
			if (j < 0) throw new Error(`Unterminated block comment at offset ${i}`)
			blank(i, j + 2)
			i = j + 2
		} else {
			if (c === ',') comma = i
			else if (c === '}' || c === ']') {
				if (comma >= 0) out[comma] = ' '
				comma = -1
			} else if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') comma = -1
			i++
		}
	}
	return out.join('')
}
