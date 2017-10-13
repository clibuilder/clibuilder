import test from 'ava'
import { Cli } from '../Cli'

import { createCliArgv } from './createCliArgv'
import { echoCommand } from './echoCommand'
import { spyDisplay } from './spyDisplay'

test('can spy on cli', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [] })
  const display = spyDisplay(cli)

  await cli.parse(createCliArgv('a'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})

test('can spy on cmd', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [echoCommand] })
  const display = spyDisplay(cli, 'echo')

  await cli.parse(createCliArgv('a', 'echo'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})
