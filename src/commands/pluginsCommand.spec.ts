import t from 'assert';
import { Cli, PluginCli, pluginsCommand } from '..';
import { createCliArgv, generateDisplayedMessage, InMemoryPresenter, InMemoryPresenterFactory } from '../test-util';

describe('list', () => {
  test('can only be used by PluginCli', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new Cli({ name: 'plugin-cli-only', version: '1.0.0', commands: [pluginsCommand] }, { cwd: 'fixtures/no-plugin', presenterFactory })
    const ui = cli.commands[0].commands![0].ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('plugin-cli-only', 'plugins', 'list'))

    const message = generateDisplayedMessage(ui.display.errorLogs)
    t.strictEqual(message, 'plugins list command can only be used by PluginCli')
  })

  test('no plugin', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli({ name: 'no-plugin', version: '1.0.0', commands: [pluginsCommand] }, { cwd: 'fixtures/no-plugin', presenterFactory })
    const ui = cli.commands[0].commands![0].ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('no-plugin', 'plugins', 'list'))

    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, 'no plugin with keyword: no-plugin-plugin')
  })

  test('one plugin', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli(
      { name: 'clibuilder', version: '1.0.0', commands: [pluginsCommand] },
      { cwd: 'fixtures/one-plugin', presenterFactory })
    const ui = cli.commands[0].commands![0].ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('clibuilder', 'plugins', 'list'))
    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found one plugin: cli-plugin-one`)
  })

  test('two plugins', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli({ name: 'clibuilder', version: '1.0.0', commands: [pluginsCommand] }, { cwd: 'fixtures/two-plugins', presenterFactory })
    const ui = cli.commands[0].commands![0].ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('clibuilder', 'plugins', 'list'))
    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found the following plugins:

  cli-plugin-one
  cli-plugin-two`)
  })
})
