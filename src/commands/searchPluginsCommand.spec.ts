import t from 'assert'
import { createCliTest, createPluginCliTest, generateDisplayedMessage } from '../test-util'
import { searchPluginsCommand } from './searchPluginsCommand'

test('can only be used by PluginCli', async () => {
  const { cli, argv, ui } = createCliTest({ commands: [searchPluginsCommand] }, 'search')
  await cli.parse(argv)

  const message = generateDisplayedMessage(ui.display.errorLogs)
  t.strictEqual(message, 'plugins search command can only be used by PluginCli')
})

test('no plugin', async () => {
  const npmSearch = () => { return [] }

  const { cli, argv, ui } = createPluginCliTest({
    name: 'no-plugin',
    context: { _dep: npmSearch, cwd: 'fixtures/no-plugin' }
  }, 'plugins', 'search')
  await cli.parse(argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, 'no package with keyword: no-plugin-plugin')
})

test('one plugin', async () => {
  const npmSearch = () => { return ['pkg-x'] }

  const { cli, argv, ui } = createPluginCliTest({
    name: 'clibuilder',
    context: { _dep: { searchByKeywords: npmSearch } }
  }, 'plugins', 'search')
  await cli.parse(argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found one package: pkg-x`)
})

test('two plugins', async () => {
  const npmSearch = () => { return ['pkg-x', 'pkg-y'] }
  const { cli, argv, ui } = createPluginCliTest({
    name: 'clibuilder',
    context: { _dep: { searchByKeywords: npmSearch } }
  }, 'plugins', 'search')
  await cli.parse(argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found the following packages:

  pkg-x
  pkg-y`)
})
