import test from 'ava'

import { loadPlugins } from './loadPlugins'

test('loads one plugin in one-plugin folder', t => {
  const plugins = loadPlugins('clibuilder-plugin', { cwd: 'fixtures/one-plugin'})
  t.is(plugins.length, 2)
  t.is(plugins[0].name, 'x')
})

test('empty folder will still load global plugins', t => {
  const plugins = loadPlugins('clibuilder-plugin', { cwd: 'fixtures/no-plugin' })
  t.is(plugins.length, 1)
})

test('local plugin will prevent global plugin to load', t => {
  const plugins = loadPlugins('clibuilder-plugin', { cwd: 'fixtures/local-plugin'})
  t.is(plugins.length, 1)
  t.is(plugins[0].name, 'x')
})
