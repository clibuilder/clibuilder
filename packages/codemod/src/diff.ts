type Line = { readonly type: ' ' | '-' | '+'; readonly text: string }

/**
 * A unified diff of two texts, with three lines of context, as `diff -u` prints it.
 * Returns an empty string when they are equal.
 */
export function unifiedDiff(fileName: string, before: string, after: string, context = 3): string {
	if (before === after) return ''
	const lines = diffLines(before.split('\n'), after.split('\n'))
	const hunks: string[] = []
	let i = 0
	while (i < lines.length) {
		if (lines[i]!.type === ' ') {
			i++
			continue
		}
		const start = Math.max(0, i - context)
		let end = i
		// extend the hunk while the next change is within two contexts of the last one
		for (;;) {
			while (end < lines.length && lines[end]!.type !== ' ') end++
			let next = end
			while (next < lines.length && lines[next]!.type === ' ') next++
			if (next < lines.length && next - end <= context * 2) end = next
			else break
		}
		end = Math.min(lines.length, end + context)
		hunks.push(hunk(lines, start, end))
		i = end
	}
	return `--- a/${fileName}\n+++ b/${fileName}\n${hunks.join('')}`
}

function hunk(lines: readonly Line[], start: number, end: number) {
	let oldStart = 1
	let newStart = 1
	for (let i = 0; i < start; i++) {
		if (lines[i]!.type !== '+') oldStart++
		if (lines[i]!.type !== '-') newStart++
	}
	const body = lines.slice(start, end)
	const oldCount = body.filter((l) => l.type !== '+').length
	const newCount = body.filter((l) => l.type !== '-').length
	const header = `@@ -${range(oldStart, oldCount)} +${range(newStart, newCount)} @@\n`
	return header + body.map((l) => `${l.type}${l.text}\n`).join('')
}

function range(start: number, count: number) {
	if (count === 0) return `${start - 1},0`
	return count === 1 ? `${start}` : `${start},${count}`
}

/** A longest-common-subsequence line diff over the part between the common prefix and suffix. */
function diffLines(a: readonly string[], b: readonly string[]): Line[] {
	let prefix = 0
	while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
	let suffix = 0
	while (
		suffix < a.length - prefix &&
		suffix < b.length - prefix &&
		a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
	) {
		suffix++
	}
	const midA = a.slice(prefix, a.length - suffix)
	const midB = b.slice(prefix, b.length - suffix)
	const n = midA.length
	const m = midB.length
	const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i]![j] = midA[i] === midB[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
		}
	}
	const middle: Line[] = []
	let i = 0
	let j = 0
	while (i < n || j < m) {
		if (i < n && j < m && midA[i] === midB[j]) {
			middle.push({ type: ' ', text: midA[i]! })
			i++
			j++
		} else if (i < n && (j === m || table[i + 1]![j]! >= table[i]![j + 1]!)) {
			middle.push({ type: '-', text: midA[i]! })
			i++
		} else {
			middle.push({ type: '+', text: midB[j]! })
			j++
		}
	}
	return [
		...a.slice(0, prefix).map((text) => ({ type: ' ' as const, text })),
		...middle,
		...a.slice(a.length - suffix).map((text) => ({ type: ' ' as const, text }))
	]
}
