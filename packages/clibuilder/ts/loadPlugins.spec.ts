import { execCommand } from '@unional/fixture'
import t from 'assert'
import { a } from 'assertron'
import { some } from 'satisfier'
import { createStandardLogForTest, logLevels } from 'standard-log'
import { loadPlugins } from './loadPlugins.js'
import { getFixturePath } from './test-utils/index.js'
import { createUI } from './ui.js'

async function testLoadPlugins(cwd: string, pluginNames: string[]) {
  const sl = createStandardLogForTest(logLevels.all)
  const ui = createUI(sl.getLogger('mock-ui'))

  const plugins = await loadPlugins({ cwd, ui }, pluginNames)
  return { reporter: sl.reporter, plugins }
}

test(`loads no plugin when plugin's activate is not a function`, async () => {
  const { stderr } = await execCommand({ caseType: 'folder', caseName: 'fixtures/bad-plugin', casePath: getFixturePath('bad-plugin') })
  expect(stderr).toContain('not a valid plugin: bad-plugin')
})

test(`loads no plugin when plugin has no index.js`, async () => {
  const { plugins } = await testLoadPlugins('fixtures/bad-plugin-no-code', ['plugin-missing-index'])
  t.strictEqual(plugins.length, 0)
})

test('loads one plugin in one-plugin folder', async () => {
  const { plugins } = await testLoadPlugins('fixtures/cls-with-one-plugin', ['cjs-plugin'])
  a.satisfies(plugins, some({ name: 'one' }))
})
