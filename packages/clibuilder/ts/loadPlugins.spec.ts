import { execCommand } from '@unional/fixture'
import { getFixturePath } from './test-utils/index.js'

it(`loads no plugin when plugin's activate is not a function`, async () => {
  const { stderr } = await execCommand({
    caseType: 'folder',
    caseName: 'fixtures/bad-plugin',
    casePath: getFixturePath('bad-plugin')
  })
  expect(stderr).toContain('not a valid plugin: bad-plugin')
})

it(`loads no plugin when plugin has no index.js`, async () => {
  const { stderr } = await execCommand({
    caseType: 'folder',
    caseName: 'fixtures/bad-plugin-no-index',
    casePath: getFixturePath('bad-plugin-no-index')
  })
  expect(stderr).toContain('not a valid plugin: bad-plugin-no-index')
})

it('loads one plugin', async () => {
  const { stdout } = await execCommand({
    caseType: 'folder',
    caseName: 'fixtures/cli-with-one-plugin',
    casePath: getFixturePath('cli-with-one-plugin')
  })
  expect(stdout).toEqual('echo hello')
})
