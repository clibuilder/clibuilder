import { test } from 'ava'

import { PluginCli } from './PluginCli'

test('use "{name}-plugin" as keyword to look for plugins', t => {
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin' })
  t.is(cli.commands.length, 2)
})

test('use custom keyword to look for plugins', t => {
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file'
  }, { cwd: 'fixtures/alt-keyword-plugin' })
  t.is(cli.commands.length, 2)
})
