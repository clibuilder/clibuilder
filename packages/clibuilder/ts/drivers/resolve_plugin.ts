import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolve } from 'import-meta-resolve'

/**
 * Resolves a plugin from `cwd`, where the project that lists it installed it.
 *
 * A bare `import(name)` resolves from clibuilder's own location instead, which is out of the project's reach
 * when the cli runs through `npx` or a global install, or inlines clibuilder into its own bundle.
 * `import-meta-resolve` applies the ESM rules, `exports` conditions included, that `require.resolve`
 * does not, and `import.meta.resolve()` only accepts a parent URL behind a flag.
 *
 * Falls back to `name` as given, so a plugin installed beside the cli still loads,
 * and a URL or absolute path passes through unchanged.
 */
export function resolvePlugin(cwd: string, name: string) {
	try {
		return resolve(name, pathToFileURL(join(cwd, 'noop.js')).href)
	} catch {
		return name
	}
}
