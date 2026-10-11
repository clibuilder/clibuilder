import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

it('is a verbatim copy of @standard-schema/spec', () => {
	const require = createRequire(import.meta.url)
	const published = readFileSync(require.resolve('@standard-schema/spec').replace(/index\.c?js$/, 'index.d.ts'), 'utf8')
	const vendored = readFileSync(new URL('./standard_schema.ts', import.meta.url), 'utf8')
	const body = vendored
		.split('\n')
		.filter((line) => !line.startsWith('// '))
		.join('\n')
		.replace('export type {', 'export {')
	expect(body).toBe(published)
})
