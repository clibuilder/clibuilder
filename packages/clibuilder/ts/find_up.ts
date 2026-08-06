import { type Dirent, readdirSync, statSync } from 'node:fs'
import { dirname, join, parse, resolve } from 'node:path'

/**
 * `darwin` and `win32` default to case-insensitive filesystems,
 * so a lookup for `foo.json` there should also match `FOO.JSON`.
 */
const caseInsensitiveFs = process.platform === 'darwin' || process.platform === 'win32'

/**
 * Walks up from `cwd` and returns the path of the first ancestor directory containing `filename`.
 */
export function findFileUp(cwd: string, filename: string) {
	for (const dir of ancestors(cwd)) {
		const filePath = join(dir, filename)
		if (isFile(filePath)) return filePath
	}
}

/**
 * Walks up from `cwd` and returns the path of the first file matching any of `filenames`.
 *
 * Each ancestor directory is read once and matched against every candidate,
 * so the cost is one `readdir` per directory instead of one walk per candidate.
 * The nearest directory wins; `filenames` order only breaks ties within a directory.
 */
export function findAnyFileUp(cwd: string, filenames: string[]) {
	for (const dir of ancestors(cwd)) {
		const entries = readEntries(dir)
		if (!entries) continue
		for (const filename of filenames) {
			const entry = lookup(entries, filename)
			if (entry && isFileEntry(dir, entry)) return join(dir, entry.name)
		}
	}
}

function* ancestors(cwd: string) {
	let dir = resolve(cwd)
	const { root } = parse(dir)
	while (true) {
		yield dir
		if (dir === root) return
		dir = dirname(dir)
	}
}

/**
 * Indexes the directory by entry name, adding a lower-cased key on case-insensitive
 * filesystems. An exact name always wins over a case-insensitive one.
 */
function readEntries(dir: string) {
	let dirents: Dirent[]
	try {
		dirents = readdirSync(dir, { withFileTypes: true })
	} catch {
		return undefined
	}
	const entries = new Map<string, Dirent>()
	for (const dirent of dirents) {
		entries.set(dirent.name, dirent)
		if (caseInsensitiveFs) {
			const lowered = dirent.name.toLowerCase()
			if (!entries.has(lowered)) entries.set(lowered, dirent)
		}
	}
	return entries
}

function lookup(entries: Map<string, Dirent>, filename: string) {
	const entry = entries.get(filename)
	if (entry || !caseInsensitiveFs) return entry
	return entries.get(filename.toLowerCase())
}

function isFileEntry(dir: string, entry: Dirent) {
	if (entry.isFile()) return true
	// a symlink pointing at a file counts as a file
	if (entry.isSymbolicLink()) return isFile(join(dir, entry.name))
	return false
}

function isFile(filePath: string) {
	return statSync(filePath, { throwIfNoEntry: false })?.isFile() ?? false
}
