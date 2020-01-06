import t from 'assert'
import a from 'assertron'
import { some } from 'satisfier'
import { loadPlugins } from './loadPlugins'

test('empty folder will still load global plugins', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/no-plugin' })
  t.strictEqual(plugins.length, 1)
})

test(`loads no plugin when plugin's activate is not a function`, async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/bad-plugin' })
  t.strictEqual(plugins.length, 1)
})

test('loads one plugin in one-plugin folder', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/one-plugin' })
  a.satisfies(plugins, some({ name: 'one' }))
})

test('local plugin will prevent global plugin to load', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/local-plugin' })
  t.strictEqual(plugins.length, 1)
  t.strictEqual(plugins[0].name, 'dummy')
})

test('plugin using activation context with destructuring', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/destructuring' })
  a.satisfies(plugins, some({ name: 'one' }))
})
