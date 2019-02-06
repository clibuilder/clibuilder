import t from 'assert';
import { PluginCli, pluginsCommand } from '..';
import { getCliCommand } from '../cli-command';
import { createCliArgv, generateDisplayedMessage, InMemoryPresenter, InMemoryPresenterFactory, setupCliCommandTest } from '../test-util';

describe('list', () => {
  test('can only be used by PluginCli', async () => {
    const { cmd, args, argv, ui } = setupCliCommandTest(pluginsCommand, [], undefined, { cwd: 'fixtures/no-plugin' })
    await cmd.commands![0].run(args, argv)

    const message = generateDisplayedMessage(ui.display.errorLogs)
    t.strictEqual(message, 'plugins list command can only be used by PluginCli')
  })

  test('no plugin', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli({
      name: 'no-plugin',
      version: '1.0.0',
      commands: [pluginsCommand]
    }, { cwd: 'fixtures/no-plugin', presenterFactory })

    const cmd = getCliCommand(['plugins', 'list'], cli.commands)!
    const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('no-plugin', 'plugins', 'list'))

    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, 'no plugin with keyword: no-plugin-plugin')
  })

  test('one plugin', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli({
      name: 'clibuilder',
      version: '1.0.0',
      commands: [pluginsCommand]
    }, { cwd: 'fixtures/one-plugin', presenterFactory })
    const cmd = getCliCommand(['plugins', 'list'], cli.commands)!
    const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('clibuilder', 'plugins', 'list'))
    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found one plugin: cli-plugin-one`)
  })

  test('two plugins', async () => {
    const presenterFactory = new InMemoryPresenterFactory()
    const cli = new PluginCli({
      name: 'clibuilder',
      version: '1.0.0',
      commands: [pluginsCommand]
    }, { cwd: 'fixtures/two-plugins', presenterFactory })
    const cmd = getCliCommand(['plugins', 'list'], cli.commands)!
    const ui = cmd.ui = new InMemoryPresenter({ name: 'clibuilder' })

    await cli.parse(createCliArgv('clibuilder', 'plugins', 'list'))
    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found the following plugins:

  cli-plugin-one
  cli-plugin-two`)
  })
})
