// The packages are ESM-only, and `require()` of an ES module throws `ERR_REQUIRE_ASYNC_MODULE`
// when any module in its static import graph uses top-level await.
// This guard walks the static graph of every public entry point, dependencies included,
// and fails on the first module that awaits at the top level.
// Dynamic `import()` is not followed: it is loaded asynchronously, so it does not block `require()`.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { relative, resolve } = require('node:path')
const test = require('node:test')
const { build, transform } = require('esbuild')

const entries = [
	'clibuilder',
	'clibuilder/axi',
	'clibuilder/testing',
	'clibuilder/compile-cache',
	'@clibuilder/plugins',
	'@clibuilder/axi'
]

/** The files the static import graph of `entry` reaches. */
async function staticGraph(entry) {
	const { metafile } = await build({
		absWorkingDir: __dirname,
		entryPoints: [require.resolve(entry)],
		bundle: true,
		platform: 'node',
		format: 'esm',
		metafile: true,
		write: false,
		logLevel: 'silent',
		plugins: [
			{
				name: 'skip-dynamic-import',
				setup(b) {
					b.onResolve({ filter: /.*/ }, (args) => (args.kind === 'dynamic-import' ? { external: true } : undefined))
				}
			}
		]
	})
	return Object.keys(metafile.inputs)
		.filter((file) => /\.[cm]?js$/.test(file))
		.map((file) => resolve(__dirname, file))
}

/** `true` when `file` awaits at the top level: esbuild refuses to emit it as CommonJS. */
async function hasTopLevelAwait(file) {
	try {
		await transform(readFileSync(file, 'utf8'), { format: 'cjs', loader: 'js', logLevel: 'silent' })
		return false
	} catch (e) {
		if (e.errors?.some((m) => /top-level await/i.test(m.text))) return true
		throw e
	}
}

for (const entry of entries) {
	test(`no module reachable from ${entry} uses top-level await`, async () => {
		const files = await staticGraph(entry)
		assert.ok(files.length > 0)
		const offenders = []
		for (const file of files) if (await hasTopLevelAwait(file)) offenders.push(relative(__dirname, file))
		assert.deepEqual(offenders, [], `top-level await makes require('${entry}') throw ERR_REQUIRE_ASYNC_MODULE`)
	})
}
