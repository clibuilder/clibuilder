import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Reads a file's bytes as UTF-8 text.
 */
export function readTextFile(path: string) {
	return readFileSync(path, 'utf-8')
}

/**
 * Imports a file as a module.
 *
 * The path becomes a file URL first: `import()` treats a bare absolute path as
 * a bare specifier on Windows, so a config at `C:\...` would not resolve.
 */
export async function importModule(path: string) {
	return import(pathToFileURL(path).href)
}
