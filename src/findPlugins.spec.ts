import test from 'ava'

import { findPlugins } from './findPlugins'

test('find no plugin in empty folder', t => {
  t.deepEqual(findPlugins('clibuilder-plugin', 'fixtures/no-plugin'), [])
})

test('find one plugin on one-plugin folder', t => {
  t.deepEqual(findPlugins('clibuilder-plugin', 'fixtures/one-plugin'), ['cli-plugin-x'])
})

test('find one plugin in scoped-plugin folder', t => {
  t.deepEqual(findPlugins('clibuilder-plugin', 'fixtures/scoped-plugin'), ['@cli/y'])
})
