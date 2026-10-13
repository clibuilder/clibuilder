import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

const entry = join(dirname(fileURLToPath(import.meta.url)), 'index.ts')

// the headless runner is for a script that does not pay for cli(), so it stays small (axi-native RFC section 4.1).
// 22 KB before ref() rendering; the resolver from the command map adds about 2 KB (next-step-refs RFC section 5)
const limit = 24 * 1024

describe('runScript bundle', { timeout: 30_000 }, () => {
	it(`is at most ${limit / 1024} KB minified`, async () => {
		const bundle = await rolldown({ input: entry, platform: 'node', logLevel: 'silent' })
		const { output } = await bundle.generate({ format: 'esm', minify: true })
		await bundle.close()
		const size = output.reduce((sum, chunk) => sum + (chunk.type === 'chunk' ? Buffer.byteLength(chunk.code) : 0), 0)
		expect(size).toBeLessThanOrEqual(limit)
	})
})
