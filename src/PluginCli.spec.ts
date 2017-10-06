import { test } from 'ava'

import { PluginCli } from './PluginCli'

test('use "{name}-plugin" as keyword to look for plugins', t => {
  const cli = new PluginCli({
    name: 'clibuilder',
    version: '1.0.0'
  }, { cwd: 'fixtures/one-plugin' })
  t.is(cli.commands.length, 2)
})
