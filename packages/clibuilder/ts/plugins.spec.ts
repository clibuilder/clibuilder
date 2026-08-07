import { execCommand } from '@unional/fixture'
import { getFixturePath } from './test-utils/index.js'

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
