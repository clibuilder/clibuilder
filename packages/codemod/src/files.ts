import fs from 'node:fs'
import path from 'node:path'

const SOURCE = /\.(?:[cm]?[jt]sx?)$/
const SKIP_DIRS = new Set(['node_modules', 'cjs', 'esm', 'dist', 'coverage'])

/**
 * The source files that `patterns` name: a file, a directory (walked for `.ts`, `.tsx`, `.js` and their
 * `.m`/`.c` forms), or a glob. Globs need Node.js 22 or newer; on older versions let the shell expand them.
 * `node_modules`, build output and `.d.ts` files are skipped.
 */
export function expandPatterns(patterns: readonly string[], cwd: string): string[] {
	const files = new Set<string>()
	for (const pattern of patterns) {
		const absolute = path.resolve(cwd, pattern)
		if (/[*?{[]/.test(pattern)) {
			for (const file of glob(pattern, cwd)) {
				if (isSource(file)) files.add(path.resolve(cwd, file))
			}
		} else if (fs.statSync(absolute, { throwIfNoEntry: false })?.isDirectory()) {
			walk(absolute, files)
		} else {
			files.add(absolute)
		}
	}
	return [...files].sort()
}

function glob(pattern: string, cwd: string): string[] {
	const globSync = (fs as { globSync?: (pattern: string, options: object) => string[] }).globSync
	if (!globSync) {
		throw new Error(`Globs need Node.js 22 or newer. Let the shell expand '${pattern}', or pass a directory.`)
	}
	return globSync(pattern, {
		cwd,
		exclude: (name: string) => SKIP_DIRS.has(path.basename(name))
	})
}

function walk(dir: string, files: Set<string>) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walk(full, files)
		} else if (isSource(entry.name)) {
			files.add(full)
		}
	}
}

function isSource(file: string) {
	return SOURCE.test(file) && !/\.d\.[cm]?ts$/.test(file) && !file.split(/[\\/]/).includes('node_modules')
}
