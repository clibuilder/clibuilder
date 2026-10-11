import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function readTextFile(path: string) {
	return readFileSync(path, 'utf-8')
}

// a file URL, since `import()` treats a bare absolute path as a bare specifier on Windows
export async function importModule(path: string) {
	return import(pathToFileURL(path).href)
}
