import test from 'ava'
import { Cli } from '../Cli'

import { createArgv } from './createArgv'
import { echoCommand } from './echoCommand'
import { spyDisplay } from './spyDisplay'

test('can spy on cli', async t => {
  const cli = new Cli('a', '0.0.0', [])
  const display = spyDisplay(cli)

  await cli.parse(createArgv('a'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})

test('can spy on cmd', t => {
  const cli = new Cli('a', '0.0.0', [echoCommand])
  const display = spyDisplay(cli, 'echo')

  cli.parse(createArgv('a', 'echo'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})
