import { test } from 'ava'

import { PluginCli } from './index'

class TestPluginCli extends PluginCli {
  ready = this.loadingPlugins
}

test('use "{name}-plugin" as keyword to look for plugins', async t => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin' })
  await cli.ready
  // there is an "global" `clibuilder-plugin-dummy` inside this project.
  // That's why there are two commands instead of one.
  t.is(cli.commands.length, 2)
})

test('use custom keyword to look for plugins', async t => {
  const cli = new TestPluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file'
  }, { cwd: 'fixtures/alt-keyword-plugin' })
  await cli.ready
  t.is(cli.commands.length, 1)
})
