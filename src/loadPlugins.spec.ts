import test from 'ava'

import { loadPlugins } from './loadPlugins'

test('empty folder will still load global plugins', async t => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/no-plugin' })
  t.is(plugins.length, 1)
})

test(`loads no plugin when plugin's activate is not a function`, async t => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/bad-plugin' })
  t.is(plugins.length, 1)
})

test('loads one plugin in one-plugin folder', async t => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/one-plugin' })
  t.is(plugins.length, 2)
  t.is(plugins[0].name, 'one')
})

test('local plugin will prevent global plugin to load', async t => {
  const plugins = await loadPlugins('clibuilder-plugin', { cwd: 'fixtures/local-plugin' })
  t.is(plugins.length, 1)
  t.is(plugins[0].name, 'dummy')
})
