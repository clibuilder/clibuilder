import ts from 'typescript'

/**
 * What a finding asks of the reader.
 *
 * - `rewrite`: the codemod changed the code.
 * - `flag`: the codemod could not change it safely, and left a `TODO(clibuilder-12)` comment above it.
 * - `review`: the code may behave differently in clibuilder 12 and is listed in the summary only.
 */
export type FindingKind = 'rewrite' | 'flag' | 'review'

export type RuleId =
	| 'zod'
	| 'zod-import'
	| 'zod-type'
	| 'format-option'
	| 'show-help'
	| 'axi-import'
	| 'plugins'
	| 'testing-import'
	| 'printed-return'

export type Finding = {
	readonly kind: FindingKind
	readonly rule: RuleId
	/** 1-based line in the input file. */
	readonly line: number
	/** 1-based column in the input file. */
	readonly column: number
	readonly message: string
}

export type Edit = { readonly start: number; readonly end: number; readonly text: string }

export const TODO_PREFIX = 'TODO(clibuilder-12):'

/**
 * The state one file's rules share: the parsed source, the edits and findings they collect,
 * and the names the file already binds.
 */
export class FileContext {
	readonly findings: Finding[] = []
	readonly edits: Edit[] = []
	/** Packages a rewrite started importing, to add to the nearest `package.json`. */
	readonly dependencies = new Set<string>()
	private readonly todos = new Map<number, string[]>()
	private identifierNames: Set<string> | undefined

	constructor(
		readonly sourceFile: ts.SourceFile,
		readonly text: string
	) {}

	position(node: ts.Node) {
		const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.sourceFile))
		return { line: line + 1, column: character + 1 }
	}

	nodeText(node: ts.Node) {
		return node.getText(this.sourceFile)
	}

	rewrite(node: ts.Node, rule: RuleId, message: string) {
		this.findings.push({ kind: 'rewrite', rule, ...this.position(node), message })
	}

	review(node: ts.Node, rule: RuleId, message: string) {
		this.findings.push({ kind: 'review', rule, ...this.position(node), message })
	}

	/** Records a finding and adds a `TODO(clibuilder-12)` comment on the line above `node`. */
	flag(node: ts.Node, rule: RuleId, message: string) {
		this.findings.push({ kind: 'flag', rule, ...this.position(node), message })
		const lineStart = this.lineStart(node.getStart(this.sourceFile))
		const messages = this.todos.get(lineStart) ?? []
		if (!messages.includes(message)) messages.push(message)
		this.todos.set(lineStart, messages)
	}

	replace(start: number, end: number, text: string) {
		this.edits.push({ start, end, text })
	}

	/** A name that no identifier in the file uses, starting with `preferred`. */
	freeName(preferred: string, ...fallbacks: string[]) {
		this.identifierNames ??= collectIdentifierNames(this.sourceFile)
		for (const name of [preferred, ...fallbacks]) {
			if (!this.identifierNames.has(name)) {
				this.identifierNames.add(name)
				return name
			}
		}
		let i = 2
		while (this.identifierNames.has(`${preferred}${i}`)) i++
		this.identifierNames.add(`${preferred}${i}`)
		return `${preferred}${i}`
	}

	/** The edits, plus one comment line per TODO that the file does not carry already. */
	allEdits(): Edit[] {
		const lines = this.text.split('\n')
		const lineStarts = this.sourceFile.getLineStarts()
		const result = [...this.edits]
		for (const [lineStart, messages] of this.todos) {
			const lineIndex = lineStarts.indexOf(lineStart)
			const existing = commentBlockAbove(lines, lineIndex)
			const indent = /^[ \t]*/.exec(lines[lineIndex] ?? '')?.[0] ?? ''
			const added = messages
				.filter((message) => !existing.includes(`${TODO_PREFIX} ${message}`))
				.map((message) => `${indent}// ${TODO_PREFIX} ${message}\n`)
			if (added.length > 0) result.push({ start: lineStart, end: lineStart, text: added.join('') })
		}
		return result
	}

	private lineStart(pos: number) {
		const { line } = this.sourceFile.getLineAndCharacterOfPosition(pos)
		return this.sourceFile.getLineStarts()[line] ?? 0
	}
}

function commentBlockAbove(lines: string[], lineIndex: number) {
	const block: string[] = []
	for (let i = lineIndex - 1; i >= 0; i--) {
		const line = lines[i]?.trim() ?? ''
		if (!line.startsWith('//')) break
		block.push(line)
	}
	return block.join('\n')
}

function collectIdentifierNames(sourceFile: ts.SourceFile) {
	const names = new Set<string>()
	const visit = (node: ts.Node) => {
		if (ts.isIdentifier(node)) names.add(node.text)
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return names
}

/**
 * Applies non-overlapping edits. At the same position an insertion goes before a replacement.
 */
export function applyEdits(text: string, edits: readonly Edit[]) {
	const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end)
	let result = text
	for (const edit of sorted) {
		result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
	}
	return result
}
