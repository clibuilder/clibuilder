import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRegistry } from 'clibuilder'
import { loadPlugins } from './load.js'

function getPluginUrl(name: string) {
	return new URL(`../test-fixtures/plugins/${name}`, import.meta.url).href
}

function setup() {
	const cwd = mkdtempSync(join(tmpdir(), 'clibuilder-plugins-'))
	const warnings: string[] = []
	const debugs: string[] = []
	const ui = {
		warn: (...args: any[]) => warnings.push(args.join(' ')),
		debug: (...args: any[]) => debugs.push(args.join(' '))
	}
	const registry = createRegistry()
	const context = { cwd, ui, registry, host: { name: 'test-cli', version: '1.0.0' } }
	return { context, cwd, warnings, debugs, registry }
}

function installPlugin(cwd: string, name: string, source: string, pjson: Record<string, unknown> = {}) {
	const dir = join(cwd, 'node_modules', name)
	mkdirSync(dir, { recursive: true })
	writeFileSync(
		join(dir, 'package.json'),
		JSON.stringify({ name, type: 'module', exports: { '.': { import: './index.js' } }, ...pjson })
	)
	writeFileSync(join(dir, 'index.js'), source)
}

it('returns the commands each plugin adds, in the order the plugins were named', async () => {
	const { context, cwd, debugs } = setup()
	// the first one activates later than the second would on its own, so order is not import order
	installPlugin(
		cwd,
		'slow-plugin',
		`export async function activate({ addCommand }) { await new Promise((r) => setTimeout(r, 10)); addCommand({ name: 'slow', run() {} }) }`
	)
	installPlugin(
		cwd,
		'fast-plugin',
		`export function activate({ addCommand }) { addCommand({ name: 'fast', run() {} }) }`
	)

	const commands = await loadPlugins(context, ['slow-plugin', 'fast-plugin'])

	expect(commands.map((c) => c.name)).toEqual(['slow', 'fast'])
	expect(debugs).toContain('activated plugin slow-plugin')
	expect(debugs).toContain('adding command fast')
})

it('reports and skips a plugin that cannot be imported', async () => {
	const { context, warnings } = setup()
	const commands = await loadPlugins(context, ['not-an-installed-plugin'])

	expect(commands).toEqual([])
	expect(warnings.join('\n')).toContain('Unable to load plugin from not-an-installed-plugin')
	expect(warnings.join('\n')).toContain(`cwd: ${context.cwd}`)
})

it('reports and skips a module that exports no activate function', async () => {
	const { context, cwd, warnings } = setup()
	installPlugin(cwd, 'not-a-plugin', 'export const something = 1')
	installPlugin(
		cwd,
		'good-plugin',
		`export function activate({ addCommand }) { addCommand({ name: 'good', run() {} }) }`
	)

	const commands = await loadPlugins(context, ['not-a-plugin', 'good-plugin'])

	expect(commands.map((c) => c.name)).toEqual(['good'])
	expect(warnings).toContain('not a valid plugin not-a-plugin')
})

it('tells a plugin which host it is extending', async () => {
	const { context, cwd } = setup()
	installPlugin(
		cwd,
		'host-plugin',
		`export function activate({ addCommand, host }) { addCommand({ name: host.name + '@' + host.version, run() {} }) }`
	)

	const commands = await loadPlugins(context, ['host-plugin'])

	expect(commands.map((c) => c.name)).toEqual(['test-cli@1.0.0'])
})

it('lets a plugin share values through the registry, and warns on a key already owned', async () => {
	const { context, warnings, registry } = setup()
	const provider = getPluginUrl('registry-provider.js')

	await loadPlugins(context, [provider, getPluginUrl('registry-provider-second.js')])

	expect(registry.get({ id: 'clibuilder:test-capability', kind: 'value' } as any)).toBe('provided')
	expect(warnings.join('\n')).toContain('could not register clibuilder:test-capability')
	expect(warnings.join('\n')).toContain(`already registered by ${provider}`)
})

// A plugin is a dependency of the project the cli runs in, not of the cli itself.
// A cli that inlines clibuilder into its own bundle, or is run through `npx` or a global install,
// sits where the project's `node_modules` is out of reach, so the plugin has to resolve from `cwd`.
// The plugin exposes only an `import` condition, as an ESM-only package does.
it('loads a plugin installed in cwd that the cli itself cannot reach', async () => {
	const { context, cwd } = setup()
	installPlugin(
		cwd,
		'cwd-only-plugin',
		`export function activate({ addCommand }) { addCommand({ name: 'cwd-only', run() { return 'from cwd' } }) }`
	)

	const [command] = await loadPlugins(context, ['cwd-only-plugin'])

	expect(command?.name).toBe('cwd-only')
})
