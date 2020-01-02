import t from 'assert'
import { assertType } from 'type-plus'
import { createCliArgv, InMemoryPresenterFactory, PluginCli } from '..'

class TestPluginCli<Config, Context> extends PluginCli<Config, Context> {
  ready = this.loadingPlugins
}

test('use "{name}-plugin" as keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    context: { cwd: 'fixtures/one-plugin' },
  })
  await cli.ready
  // there is an "global" `clibuilder-plugin-dummy` inside this project.
  // and the default `pluginsCommand`
  // That's why there are 3 commands instead of 1.
  t.strictEqual(cli.commands.length, 3)
})

test('use custom keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file',
    context: { cwd: 'fixtures/alt-keyword-plugin' },
  })
  await cli.ready
  t.strictEqual(cli.commands.length, 2)
})

test('command is loaded when parse', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    context: { cwd: 'fixtures/one-plugin', presenterFactory },
  })

  await cli.parse(createCliArgv('clibuilder', 'one', 'echo'))
  t.strictEqual(presenterFactory.commandPresenter!.display.infoLogs[0][0], 'echo')
})

test('use custom keyword to look for plugins', async () => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: '2-cmd',
    context: { cwd: 'fixtures/plugin-with-2-top-commands' },
  })
  await cli.ready
  t.strictEqual(cli.commands.length, 3)
})

test('PluginCli can add commands at its own project', async () => {
  const cli = new TestPluginCli({
    name: 'defaultCommands',
    version: '1.0.0',
    commands: [{ name: 'x', run() { return } }],
  })
  await cli.ready
  t.strictEqual(cli.commands.length, 1)
})

test('can define default config', async () => {
  const cli = new TestPluginCli({
    name: 'cli',
    version: '1',
    defaultConfig: { a: 1 },
    commands: [{
      name: 'cmd',
      run() {
        assertType.isNumber(this.config.a)
      },
    }],
  })
  await cli.ready
})

test('is runnable with ui', async () => {
  const cli = new TestPluginCli({
    name: 'cli',
    version: '1.0.0',
    run() {
      this.ui.info('hello world')
    }
  })
  await cli.ready
})
