import t from 'assert'
import { generateDisplayedMessage, setupCliCommandTest, createCliArgv, InMemoryPresenter, InMemoryPresenterFactory } from '../test-util'
import { searchPluginsCommand } from './searchPluginsCommand'
import { getCliCommand } from '../cli-command'
import { pluginsCommand } from '.'
import { PluginCli } from '..'

test('can only be used by PluginCli', async () => {
  const { cmd, args, argv, ui } = setupCliCommandTest(searchPluginsCommand, [], undefined)
  await cmd.run(args, argv)

  const message = generateDisplayedMessage(ui.display.errorLogs)
  t.strictEqual(message, 'plugins search command can only be used by PluginCli')
})

test('no plugin', async () => {
  const npmSearch = () => { return [] }

  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new PluginCli({
    name: 'no-plugin',
    version: '1.0.0',
    commands: [pluginsCommand],
    context: { _dep: npmSearch, cwd: 'fixtures/no-plugin', presenterFactory },
  })

  const cmd = getCliCommand(['plugins', 'search'], cli.commands)!
  const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

  await cli.parse(createCliArgv('no-plugin', 'plugins', 'search'))

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, 'no package with keyword: no-plugin-plugin')
})

test('one plugin', async () => {
  const npmSearch = () => { return ['pkg-x'] }
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    commands: [pluginsCommand],
    context: {
      _dep: { searchByKeywords: npmSearch }, presenterFactory
    },
  })
  const cmd = getCliCommand(['plugins', 'search'], cli.commands)!
  const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

  await cli.parse(createCliArgv('clibuilder', 'plugins', 'search'))
  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found one package: pkg-x`)
})

test('two plugins', async () => {
  const npmSearch = () => { return ['pkg-x', 'pkg-y'] }
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    commands: [pluginsCommand],
    context: {
      _dep: { searchByKeywords: npmSearch }, presenterFactory
    },
  })
  const cmd = getCliCommand(['plugins', 'search'], cli.commands)!
  const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

  await cli.parse(createCliArgv('clibuilder', 'plugins', 'search'))
  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found the following packages:

  pkg-x
  pkg-y`)
})
