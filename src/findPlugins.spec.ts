import a from 'assertron';
import { findPlugins } from './findPlugins';

test('find no plugin in empty folder', async () => {
  a.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/no-plugin'), [])
})

test('find one plugin on one-plugin folder', async () => {
  a.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/one-plugin'), ['cli-plugin-one'])
})

test('find one plugin in scoped-plugin folder', async () => {
  a.deepEqual(await findPlugins('clibuilder-plugin', 'fixtures/scoped-plugin'), ['@cli/y'])
})
