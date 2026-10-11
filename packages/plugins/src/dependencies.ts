import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * The direct dependencies of the project at `cwd` that carry any of `keywords`,
 * in `package.json` order: `dependencies`, then `devDependencies`.
 *
 * Only the nearest `package.json` is read, and only the packages it lists are checked,
 * so a package pulled in by another package never adds commands.
 * A listed package that is not installed is skipped.
 */
export async function findDependencyPlugins(cwd: string, keywords: string[]) {
	const project = await findPackageJson(cwd)
	if (!project) return []
	const names = [...Object.keys(project.json.dependencies ?? {}), ...Object.keys(project.json.devDependencies ?? {})]
	const found: string[] = []
	for (const name of new Set(names)) {
		const pjson = await readDependencyPackageJson(project.dir, name)
		const declared: unknown = pjson?.keywords
		if (Array.isArray(declared) && declared.some((k) => keywords.includes(k))) found.push(name)
	}
	return found
}

async function findPackageJson(cwd: string) {
	for (let dir = cwd; ; dir = dirname(dir)) {
		const json = await readJson(join(dir, 'package.json'))
		if (json) return { dir, json }
		if (dirname(dir) === dir) return undefined
	}
}

/**
 * Reads an installed dependency's `package.json` the way Node.js finds a package:
 * `node_modules/<name>` in the project directory, then in each ancestor.
 *
 * This is the one place a dependency is located on disk. It walks `node_modules`,
 * so it finds nothing under Yarn PnP. That is the same gap as #575 (`plugins list`
 * finds nothing under Yarn PnP), and one PnP-aware resolver should fix both
 * (slim-dependencies RFC section 9.6).
 */
async function readDependencyPackageJson(projectDir: string, name: string) {
	for (let dir = projectDir; ; dir = dirname(dir)) {
		const json = await readJson(join(dir, 'node_modules', name, 'package.json'))
		if (json) return json
		if (dirname(dir) === dir) return undefined
	}
}

async function readJson(path: string): Promise<Record<string, any> | undefined> {
	try {
		return JSON.parse(await readFile(path, 'utf8'))
	} catch {
		return undefined
	}
}
