import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execCommand } from '@unional/fixture'
import { builder } from '../app/builder.js'
import { mockContext } from '../drivers/context.mock.js'
import { argv } from '../test-utils/argv.js'
import { getFixturePath } from '../test-utils/index.js'

function getPluginUrl(name: string) {
	return new URL(`../../test-fixtures/plugins/${name}`, import.meta.url).href
}

it(`loads no plugin when plugin's activate is not a function`, async () => {
	// the fixture cli has no default command, so running it bare is a usage error (#609)
	const { stderr, exitCode } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/bad-plugin',
		casePath: getFixturePath('bad-plugin')
	}).catch((e) => e)
	expect(exitCode).toBe(2)
	expect(stderr).toContain('not a valid plugin')
	expect(stderr).toContain('bad-plugin')
})

it('loads no plugin when plugin has no index.js', async () => {
	// the fixture cli has no default command, so running it bare is a usage error (#609)
	const { stderr, exitCode } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/bad-plugin-no-index',
		casePath: getFixturePath('bad-plugin-no-index')
	}).catch((e) => e)
	expect(exitCode).toBe(2)
	expect(stderr).toContain('not a valid plugin')
	expect(stderr).toContain('bad-plugin-no-index')
})

it('loads one plugin', async () => {
	const { stdout } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/cli-with-one-plugin',
		casePath: getFixturePath('cli-with-one-plugin')
	})
	expect(stdout).toEqual('echo hello')
})

// https://github.com/clibuilder/clibuilder/issues/286
// `execCommand()` resolves only when the child process exits on its own,
// so this hangs (and times out) if an async plugin command retains the event loop.
it('exits after an async plugin command resolves', async () => {
	const { stdout } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/cli-with-async-plugin',
		casePath: getFixturePath('cli-with-async-plugin')
	})
	expect(stdout).toEqual('echo hello')
})

it('lets a command consume capabilities and content contributed by a later plugin', async () => {
	const context = mockContext()
	const provider = getPluginUrl('registry-provider.js')
	context.loadConfig = async () => ({
		plugins: [getPluginUrl('registry-consumer.js'), provider, getPluginUrl('registry-provider-second.js')]
	})
	const app = builder(context, { name: 'test-cli', version: '1.0.0', config: true }).default({ run() {} })

	expect(await app.parse(argv('test-cli registry'))).toEqual({
		capability: 'provided',
		sources: [provider]
	})
	expect(context.sl.reporter.getLogMessage()).toContain('could not register clibuilder:test-capability')
	expect(context.sl.reporter.getLogMessage()).toContain('already registered by')
})

// A plugin is a dependency of the project the cli runs in, not of the cli itself.
// A cli that inlines clibuilder into its own bundle, or is run through `npx` or a global install,
// sits where the project's `node_modules` is out of reach, so the plugin has to resolve from `cwd`.
// The plugin exposes only an `import` condition, as an ESM-only package does.
it('loads a plugin installed in cwd that the cli itself cannot reach', async () => {
	const context = mockContext()
	const pluginDir = join(context.cwd, 'node_modules', 'cwd-only-plugin')
	mkdirSync(pluginDir, { recursive: true })
	writeFileSync(
		join(pluginDir, 'package.json'),
		JSON.stringify({ name: 'cwd-only-plugin', type: 'module', exports: { '.': { import: './index.js' } } })
	)
	writeFileSync(
		join(pluginDir, 'index.js'),
		`export function activate({ addCommand }) { addCommand({ name: 'cwd-only', run() { return 'from cwd' } }) }`
	)
	context.loadConfig = async () => ({ plugins: ['cwd-only-plugin'] })
	const app = builder(context, { name: 'test-cli', version: '1.0.0', config: true }).default({ run() {} })

	expect(await app.parse(argv('test-cli cwd-only'))).toEqual('from cwd')
})
