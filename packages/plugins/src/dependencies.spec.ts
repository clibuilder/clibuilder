import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findDependencyPlugins } from './dependencies.js'

function project(pjson: Record<string, unknown>) {
	const dir = mkdtempSync(join(tmpdir(), 'clibuilder-plugins-deps-'))
	writeFileSync(join(dir, 'package.json'), JSON.stringify(pjson))
	return dir
}

function install(dir: string, name: string, keywords?: string[]) {
	const pkgDir = join(dir, 'node_modules', name)
	mkdirSync(pkgDir, { recursive: true })
	writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name, keywords }))
}

it('finds the direct dependencies carrying any of the keywords, dependencies before devDependencies', async () => {
	const dir = project({
		dependencies: { 'plugin-b': '1', unrelated: '1' },
		devDependencies: { 'plugin-a': '1' }
	})
	install(dir, 'plugin-a', ['my-cli'])
	install(dir, 'plugin-b', ['other', 'my-cli-plugin'])
	install(dir, 'unrelated', ['something'])

	expect(await findDependencyPlugins(dir, ['my-cli', 'my-cli-plugin'])).toEqual(['plugin-b', 'plugin-a'])
})

it('never checks a package that the project does not list itself', async () => {
	const dir = project({ dependencies: {} })
	install(dir, 'transitive-plugin', ['my-cli'])

	expect(await findDependencyPlugins(dir, ['my-cli'])).toEqual([])
})

it('reads the nearest package.json above cwd, and finds packages installed in an ancestor', async () => {
	const root = project({ name: 'root' })
	const dir = join(root, 'app')
	mkdirSync(join(dir, 'src'), { recursive: true })
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { 'hoisted-plugin': '1' } }))
	install(root, 'hoisted-plugin', ['my-cli'])

	expect(await findDependencyPlugins(join(dir, 'src'), ['my-cli'])).toEqual(['hoisted-plugin'])
})

it('skips a listed package that is not installed, or declares no keywords', async () => {
	const dir = project({ dependencies: { missing: '1', 'no-keywords': '1' } })
	install(dir, 'no-keywords')

	expect(await findDependencyPlugins(dir, ['my-cli'])).toEqual([])
})

it('finds nothing when there is no package.json above cwd', async () => {
	expect(await findDependencyPlugins(mkdtempSync(join(tmpdir(), 'clibuilder-plugins-none-')), ['my-cli'])).toEqual([])
})
