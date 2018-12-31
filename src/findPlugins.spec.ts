import t from 'assert';
import { findPlugins } from './findPlugins';

test('find no plugin in empty folder', async () => {
  t.strictEqual((await findPlugins('clibuilder-plugin', 'fixtures/no-plugin')).length, 0)
})

test('find one plugin on one-plugin folder', async () => {
  const actual = await findPlugins('clibuilder-plugin', 'fixtures/one-plugin')
  t.strictEqual(actual.length, 1)
  t.strictEqual(actual[0], 'cli-plugin-one')
})

test('find one plugin in scoped-plugin folder', async () => {
  const actual = await findPlugins('clibuilder-plugin', 'fixtures/scoped-plugin')
  t.strictEqual(actual.length, 1)
  t.strictEqual(actual[0], '@cli/y')
})
