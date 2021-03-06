import t from 'assert'
import a from 'assertron'
import { some } from 'satisfier'
import { config, createMemoryLogReporter, getLogger, logLevels } from 'standard-log'
import { loadPlugins } from './loadPlugins'
import { getLogMessage } from './test-utils'

async function testLoadPlugins(cwd: string, keyword: string) {
  const reporter = createMemoryLogReporter({ id: 'mock-reporter' })
  config({
    logLevel: logLevels.all,
    reporters: [reporter],
    mode: 'test'
  })
  const log = getLogger('mock-ui', { level: logLevels.all, writeTo: 'mock-reporter' })

  const plugins = await loadPlugins({ cwd, log }, keyword)
  return { reporter, plugins }
}

test('empty folder will still load global plugins', async () => {
  const { plugins } = await testLoadPlugins('fixtures/no-plugin', 'clibuilder-plugin')
  t.strictEqual(plugins.length, 1)
})

test(`loads no plugin when plugin's activate is not a function`, async () => {
  const { plugins } = await testLoadPlugins('fixtures/bad-plugin', 'clibuilder-plugin')
  t.strictEqual(plugins.length, 1)
})

test(`loads no plugin when plugin has no index.js`, async () => {
  const { plugins } = await testLoadPlugins('fixtures/bad-plugin-no-code', 'clibuilder-plugin')
  t.strictEqual(plugins.length, 1)
})

test('loads one plugin in one-plugin folder', async () => {
  const { plugins } = await testLoadPlugins('fixtures/one-plugin', 'plugin-cli-plugin')
  a.satisfies(plugins, some({ name: 'one' }))
})

test('local plugin will prevent global plugin to load', async () => {
  const { plugins } = await testLoadPlugins('fixtures/local-plugin', 'clibuilder-plugin')
  t.strictEqual(plugins.length, 1)
  t.strictEqual(plugins[0].name, 'dummy')
})

test('plugin using activation context with destructuring', async () => {
  const { plugins } = await testLoadPlugins('fixtures/destructuring', 'clibuilder-plugin')
  a.satisfies(plugins, some({ name: 'one' }))
})

test('bad plugin', async () => {
  const { reporter } = await testLoadPlugins('fixtures/bad-plugin', 'clibuilder-plugin')
  expect(getLogMessage(reporter)).toContain('not a valid plugin cli-plugin-x')
})
