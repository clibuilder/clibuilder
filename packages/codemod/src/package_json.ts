import fs from 'node:fs'
import path from 'node:path'

/** The version range the codemod adds for each package it starts importing: the first releases that support clibuilder 12. */
export const DEPENDENCY_RANGES: Record<string, string> = {
	'@clibuilder/plugins': '^0.2.0'
}

/** The nearest `package.json` at or above `dir`. */
export function findPackageJson(dir: string): string | undefined {
	let current = dir
	for (;;) {
		const candidate = path.join(current, 'package.json')
		if (fs.existsSync(candidate)) return candidate
		const parent = path.dirname(current)
		if (parent === current) return undefined
		current = parent
	}
}

/**
 * Adds the missing `dependencies` to a `package.json` text, keeping its indentation.
 * Returns the text unchanged when every package is listed already.
 */
export function addDependencies(text: string, packages: readonly string[]): string {
	const json = JSON.parse(text) as Record<string, Record<string, string> | undefined>
	const listed = (name: string) =>
		['dependencies', 'devDependencies', 'peerDependencies'].some((field) => json[field]?.[name] !== undefined)
	const missing = packages.filter((name) => !listed(name))
	if (missing.length === 0) return text
	const dependencies = { ...json['dependencies'] }
	for (const name of missing) dependencies[name] = DEPENDENCY_RANGES[name] ?? '*'
	json['dependencies'] = Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)))
	const indent = /^[ \t]+/m.exec(text)?.[0] ?? '\t'
	return `${JSON.stringify(json, undefined, indent)}${text.endsWith('\n') ? '\n' : ''}`
}
