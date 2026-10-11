import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type cli, createRegistry, type ExtensionContext } from 'clibuilder'
import { plugins } from './plugins.js'

function setup({ config, pjson }: { config?: unknown; pjson?: Record<string, unknown> } = {}) {
	const cwd = mkdtempSync(join(tmpdir(), 'clibuilder-plugins-ext-'))
	if (pjson) writeFileSync(join(cwd, 'package.json'), JSON.stringify(pjson))
	const commands: cli.Command[] = []
	const ui = {
		displayLevel: 'info' as const,
		info() {},
		warn() {},
		error() {},
		debug() {},
		showHelp() {},
		showVersion() {}
	}
	const context: ExtensionContext = {
		host: { name: 'test-cli', version: '1.0.0' },
		cwd,
		ui,
		registry: createRegistry(),
		shared: { get: () => undefined, set() {}, has: () => false },
		addCommand: (c) => commands.push(c),
		addGlobalOption() {},
		beforeRun() {},
		resolveConfig: async () =>
			config === undefined
				? { config: undefined, source: { type: 'none' }, candidates: [] }
				: { config, source: { type: 'file', path: join(cwd, '.test-clirc.json'), format: 'jsonc' }, candidates: [] }
	}
	return { context, cwd, commands, names: () => commands.map((c) => c.name) }
}

function install(cwd: string, name: string, keywords: string[] = []) {
	const dir = join(cwd, 'node_modules', name)
	mkdirSync(dir, { recursive: true })
	writeFileSync(
		join(dir, 'package.json'),
		JSON.stringify({ name, keywords, type: 'module', exports: { '.': { import: './index.js' } } })
	)
	writeFileSync(
		join(dir, 'index.js'),
		`export function activate({ addCommand }) { addCommand({ name: '${name}', run() {} }) }`
	)
}

/** Runs `plugins list` from a group, with a fake in place of the installed-package walk. */
async function listedKeywords(group: cli.Command) {
	const list = (group as any).commands[0]
	let keywords: string[] | undefined
	await list.run.call(
		{
			ui: { info() {} },
			cwd: '.',
			context: {
				findByKeywords: async (k: string[]) => {
					keywords = k
					return []
				}
			}
		},
		{}
	)
	return keywords
}

it('adds the plugins group, looking for the cli name by default', async () => {
	const { context, commands, names } = setup()
	await plugins()(context)
	expect(names()).toEqual(['plugins'])
	expect(await listedKeywords(commands[0]!)).toEqual(['test-cli'])
})

it('looks for the keywords it is given', async () => {
	const { context, commands } = setup()
	await plugins({ keywords: ['my-cli-plugin'] })(context)
	expect(await listedKeywords(commands[0]!)).toEqual(['my-cli-plugin'])
})

it('adds no plugins group when told not to', async () => {
	const { context, names } = setup()
	await plugins({ command: false })(context)
	expect(names()).toEqual([])
})

it('loads the plugins the cli author includes, without any config', async () => {
	const { context, cwd, names } = setup()
	install(cwd, 'plugin-a')
	install(cwd, 'plugin-b')
	await plugins({ include: ['plugin-b', 'plugin-a'], command: false })(context)
	expect(names()).toEqual(['plugin-b', 'plugin-a'])
})

it('loads the plugins named by the plugins key in config', async () => {
	const { context, cwd, names } = setup({ config: { plugins: ['plugin-a'] } })
	install(cwd, 'plugin-a')
	await plugins()(context)
	expect(names()).toEqual(['plugins', 'plugin-a'])
})

it('ignores the plugins key when config is turned off', async () => {
	const { context, cwd, names } = setup({ config: { plugins: ['plugin-a'] } })
	install(cwd, 'plugin-a')
	await plugins({ config: false, command: false })(context)
	expect(names()).toEqual([])
})

it('ignores a plugins key that is not a list of names', async () => {
	const { context, names } = setup({ config: { plugins: 'plugin-a' } })
	await plugins({ command: false })(context)
	expect(names()).toEqual([])
})

it('loads the direct dependencies carrying a keyword only when asked to', async () => {
	const pjson = { dependencies: { 'dep-plugin': '1', other: '1' } }
	const off = setup({ pjson })
	install(off.cwd, 'dep-plugin', ['test-cli'])
	await plugins({ command: false })(off.context)
	expect(off.names()).toEqual([])

	const on = setup({ pjson })
	install(on.cwd, 'dep-plugin', ['test-cli'])
	install(on.cwd, 'other', ['unrelated'])
	await plugins({ command: false, dependencies: true })(on.context)
	expect(on.names()).toEqual(['dep-plugin'])
})

it('loads include, then dependencies, then config, each package once at its first position', async () => {
	const { context, cwd, names } = setup({
		config: { plugins: ['from-config', 'included'] },
		pjson: { dependencies: { 'from-dependencies': '1', included: '1' } }
	})
	install(cwd, 'included', ['test-cli'])
	install(cwd, 'from-dependencies', ['test-cli'])
	install(cwd, 'from-config')
	await plugins({ include: ['included'], dependencies: true, command: false })(context)
	expect(names()).toEqual(['included', 'from-dependencies', 'from-config'])
})

it('lets config exclude a plugin from the other sources with a ! prefix', async () => {
	const { context, cwd, names } = setup({ config: { plugins: ['!plugin-a'] } })
	install(cwd, 'plugin-a')
	install(cwd, 'plugin-b')
	await plugins({ include: ['plugin-a', 'plugin-b'], command: false })(context)
	expect(names()).toEqual(['plugin-b'])
})
