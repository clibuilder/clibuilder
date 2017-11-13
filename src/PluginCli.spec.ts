import { test } from 'ava'

import { PluginCli } from './index'

test('use "{name}-plugin" as keyword to look for plugins', t => {
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin' })
  // there is an "global" `clibuilder-plugin-dummy` inside this project.
  // That's why there are two commands instead of one.
  t.is(cli.commands.length, 2)
})

test('use custom keyword to look for plugins', t => {
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file'
  }, { cwd: 'fixtures/alt-keyword-plugin' })
  t.is(cli.commands.length, 1)
})
