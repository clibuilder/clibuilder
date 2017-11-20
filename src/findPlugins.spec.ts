import test from 'ava'

import { findPlugins } from './findPlugins'

test('find no plugin in empty folder', async t => {
  t.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/no-plugin'), [])
})

test('find one plugin on one-plugin folder', async t => {
  t.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/one-plugin'), ['cli-plugin-one'])
})

test('find one plugin in scoped-plugin folder', async t => {
  t.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/scoped-plugin'), ['@cli/y'])
})
