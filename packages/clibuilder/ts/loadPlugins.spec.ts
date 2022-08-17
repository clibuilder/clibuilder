import t from 'assert'
import a from 'assertron'
import { some } from 'satisfier'
import { loadPlugins } from './loadPlugins.js'
import { getLogMessage } from './test-utils/index.js'
import { mockUI } from './ui.mock.js'

async function testLoadPlugins(cwd: string, pluginNames: string[]) {
  const [ui, reporter] = mockUI()
  const plugins = await loadPlugins({ cwd, ui }, pluginNames)
  return { reporter, plugins }
}

test('empty folder will still load global plugins', async () => {
  const { plugins } = await testLoadPlugins('fixtures/no-plugin', ['clibuilder-plugin'])
  t.strictEqual(plugins.length, 0)
})

test(`loads no plugin when plugin's activate is not a function`, async () => {
  const { plugins } = await testLoadPlugins('fixtures/bad-plugin', ['clibuilder-plugin'])
  t.strictEqual(plugins.length, 0)
})

test(`loads no plugin when plugin has no index.js`, async () => {
  const { plugins } = await testLoadPlugins('fixtures/bad-plugin-no-code', ['clibuilder-plugin'])
  t.strictEqual(plugins.length, 0)
})

test('loads one plugin in one-plugin folder', async () => {
  const { plugins } = await testLoadPlugins('fixtures/one-plugin', ['cli-plugin-one'])
  a.satisfies(plugins, some({ name: 'one' }))
})

test('local plugin will prevent global plugin to load', async () => {
  const { plugins } = await testLoadPlugins('fixtures/local-plugin', ['clibuilder-plugin-dummy'])
  t.strictEqual(plugins.length, 1)
  t.strictEqual(plugins[0].name, 'dummy')
})

test('plugin using activation context with destructuring', async () => {
  const { plugins } = await testLoadPlugins('fixtures/destructuring', ['cli-plugin-one'])
  a.satisfies(plugins, some({ name: 'one' }))
})

test('bad plugin', async () => {
  const { reporter } = await testLoadPlugins('fixtures/bad-plugin', ['cli-plugin-x'])
  expect(getLogMessage(reporter)).toContain('not a valid plugin cli-plugin-x')
})
