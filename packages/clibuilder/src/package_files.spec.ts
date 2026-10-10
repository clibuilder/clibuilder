import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const tsDir = dirname(fileURLToPath(import.meta.url))
const unpublished = /\.(internal|accept|integrate|spec|system|test|unit)\./

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return sourceFiles(path)
		return entry.name.endsWith('.ts') ? [path] : []
	})
}

test('published modules import only published modules', () => {
	const published = sourceFiles(tsDir).filter((file) => !unpublished.test(file))
	const offenders = published.flatMap((file) =>
		[...readFileSync(file, 'utf8').matchAll(/from '(\.[^']+)'/g)]
			.map((m) => m[1])
			.filter((specifier) => unpublished.test(specifier))
			.map((specifier) => `${relative(tsDir, file)} -> ${specifier}`)
	)
	expect(offenders).toEqual([])
})
