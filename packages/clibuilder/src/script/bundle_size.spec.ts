import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

const src = dirname(dirname(fileURLToPath(import.meta.url)))
const entry = join(src, 'script', 'index.ts')

// the headless runner is for a script that does not pay for cli(), so it stays small (axi-native RFC section 4.1).
// 22 KB before ref() rendering, which adds about 2 KB (next-step-refs RFC section 5),
// and sharing cli()'s lookup and usage-error report adds about 10 KB (#706): measured at 33,740 bytes.
const limit = 34 * 1024

// the source files the runner may bundle: tier B, the ref() resolver, and the lookup and usage-error report it shares with cli()
const allowed = [
	'app/errors.ts',
	'descriptor.ts',
	'invocation/argv.ts',
	'invocation/argv_occurrences.ts',
	'invocation/descriptors.ts',
	'invocation/lookup.ts',
	'render/answer.ts',
	'render/encode.ts',
	'render/error.ts',
	'render/help.ts',
	'render/ref.ts',
	'render/text.ts',
	'render/usage_error.ts',
	'script/index.ts',
	'script/refs.ts',
	'script/run_script.ts'
]

describe('runScript bundle', { timeout: 30_000 }, () => {
	async function build() {
		const bundle = await rolldown({ input: entry, platform: 'node', logLevel: 'silent' })
		const { output } = await bundle.generate({ format: 'esm', minify: true })
		await bundle.close()
		return output.flatMap((chunk) => (chunk.type === 'chunk' ? [chunk] : []))
	}

	it(`is at most ${limit / 1024} KB minified`, async () => {
		const size = (await build()).reduce((sum, chunk) => sum + Buffer.byteLength(chunk.code), 0)
		expect(size).toBeLessThanOrEqual(limit)
	})

	// cli(), the builder, config, plugins and the drivers stay out: what the runner shares is tree-shaken to the lookup
	it('bundles only tier B and the shared lookup', async () => {
		const sources = (await build())
			.flatMap((chunk) => Object.keys(chunk.modules))
			.filter((id) => !id.includes('node_modules') && id.startsWith(src))
			.map((id) => relative(src, id).replace(/\\/g, '/'))
		expect(sources).toContain('script/run_script.ts')
		expect(sources.filter((f) => !allowed.includes(f))).toEqual([])
	})
})
