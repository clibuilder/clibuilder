import { execCommand } from '@unional/fixture'
import { builder } from './builder.js'
import { mockContext } from './context.mock.js'
import { argv } from './test-utils/argv.js'
import { getFixturePath } from './test-utils/index.js'

function getPluginUrl(name: string) {
	return new URL(`../test-fixtures/plugins/${name}`, import.meta.url).href
}

it(`loads no plugin when plugin's activate is not a function`, async () => {
	const { stderr } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/bad-plugin',
		casePath: getFixturePath('bad-plugin')
	})
	expect(stderr).toContain('not a valid plugin')
	expect(stderr).toContain('bad-plugin')
})

it('loads no plugin when plugin has no index.js', async () => {
	const { stderr } = await execCommand({
		caseType: 'folder',
		caseName: 'fixtures/bad-plugin-no-index',
		casePath: getFixturePath('bad-plugin-no-index')
	})
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
