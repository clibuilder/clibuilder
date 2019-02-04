import t from 'assert';
import { createCliArgv, InMemoryPresenterFactory, PluginCli } from '..';

class TestPluginCli extends PluginCli {
  ready = this.loadingPlugins
}

test('use "{name}-plugin" as keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin' })
  await cli.ready
  // there is an "global" `clibuilder-plugin-dummy` inside this project.
  // That's why there are two commands instead of one.
  t.strictEqual(cli.commands.length, 2)
})

test('use custom keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file'
  }, { cwd: 'fixtures/alt-keyword-plugin' })
  await cli.ready
  t.strictEqual(cli.commands.length, 1)
})

test('command is loaded when parse', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin', presenterFactory })

  await cli.parse(createCliArgv('clibuilder', 'one', 'echo'))
  const presenter = presenterFactory.commandPresenter!
  t.strictEqual(presenter.display.infoLogs[0][0], 'echo')
})

test('use custom keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: '2-cmd'
  }, { cwd: 'fixtures/plugin-with-2-top-commands' })
  await cli.ready
  t.strictEqual(cli.commands.length, 2)
})

test('PluginCli can add commands at its own project', async () => {
  const cli = new TestPluginCli({
    name: 'defaultCommands',
    version: '1.0.0',
    commands: [{ name: 'x', run() { return } }]
  })
  await cli.ready
  t.strictEqual(cli.commands.length, 1)
})
