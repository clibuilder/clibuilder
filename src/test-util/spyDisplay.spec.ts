import test from 'ava'
import { Cli } from '../Cli'

import { createArgv } from './createArgv'
import { echoCommand } from './echoCommand'
import { spyDisplay } from './spyDisplay'

test('can spy on cli', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [] })
  const display = spyDisplay(cli)

  await cli.parse(createArgv('a'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})

test('can spy on cmd', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [echoCommand] })
  const display = spyDisplay(cli, 'echo')

  await cli.parse(createArgv('a', 'echo'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})
