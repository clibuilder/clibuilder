import t from 'assert'

import { loadPlugins } from './loadPlugins'

test('empty folder will still load global plugins', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/no-plugin' })
  t.equal(plugins.length, 1)
})

test(`loads no plugin when plugin's activate is not a function`, async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/bad-plugin' })
  t.equal(plugins.length, 1)
})

test('loads one plugin in one-plugin folder', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/one-plugin' })
  t.equal(plugins.length, 2)
  t.equal(plugins[0].name, 'one')
})

test('local plugin will prevent global plugin to load', async () => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/local-plugin' })
  t.equal(plugins.length, 1)
  t.equal(plugins[0].name, 'dummy')
})
