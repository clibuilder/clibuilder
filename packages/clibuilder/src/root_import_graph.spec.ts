import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const runtimePackages = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})])

/** The source modules and the packages that the module graph of `entry` reaches. */
async function importGraph(entry: string) {
	const { metafile } = await build({
		absWorkingDir: packageDir,
		entryPoints: [entry],
		bundle: true,
		platform: 'node',
		format: 'esm',
		packages: 'external',
		metafile: true,
		write: false,
		logLevel: 'silent'
	})
	const modules = Object.keys(metafile.inputs)
	const packages = new Set(
		Object.values(metafile.inputs).flatMap((input) =>
			input.imports.filter((i) => i.external).map((i) => packageName(i.path))
		)
	)
	return { modules, packages: [...packages] }
}

function packageName(specifier: string) {
	const parts = specifier.split('/')
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!
}

/** What in the graph is test-only: the testing code, and any package that is not a runtime dependency. */
function testOnly(graph: Awaited<ReturnType<typeof importGraph>>) {
	return [
		...graph.modules.filter((m) => /^src\/(testing|test-utils)\/|\.mock\.ts$/.test(m)),
		...graph.packages.filter((p) => !p.startsWith('node:') && !builtinModules.includes(p) && !runtimePackages.has(p))
	]
}

describe('root entry import graph', { timeout: 30_000 }, () => {
	it('does not reach test-only code or test-only dependencies', async () => {
		const graph = await importGraph('src/index.ts')
		expect(graph.modules).toContain('src/cli.ts')
		expect(testOnly(graph)).toEqual([])
	})

	it('reports the testing code when an entry reaches it', async () => {
		const graph = await importGraph('src/testing/index.ts')
		expect(testOnly(graph)).toEqual(
			expect.arrayContaining(['src/testing/test_command.ts', 'src/drivers/context.mock.ts'])
		)
	})
})

/** The config loader: the lookup, find-up, the file readers and the parsers. */
const configLoader = [
	'src/config.ts',
	'src/drivers/find_up.ts',
	'src/drivers/package_json.ts',
	'src/drivers/read_file.ts',
	'src/drivers/yaml.ts'
]

describe('config loading', { timeout: 30_000 }, () => {
	it('is not reached by the root entry, so a cli without .use(config()) does not contain it (#692)', async () => {
		const graph = await importGraph('src/index.ts')
		expect(graph.modules.filter((m) => configLoader.includes(m))).toEqual([])
		expect(graph.packages).not.toContain('jsonc-parser')
		expect(graph.packages).not.toContain('js-yaml')
	})

	it('is reached by the clibuilder/config entry', async () => {
		const graph = await importGraph('src/config/index.ts')
		expect(graph.modules).toEqual(expect.arrayContaining(configLoader))
		expect(testOnly(graph)).toEqual([])
	})
})
