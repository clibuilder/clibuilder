import test from 'ava'
import { Cli, createCliArgv, echoAllCommand, spyDisplay } from '../index'

test('can spy on cli', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [] })
  const display = spyDisplay(cli)

  await cli.parse(createCliArgv('a'))

  // console will still display the help messages
  t.true(display.infoLogs.length > 0)
})

test('can spy on cmd', async t => {
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [echoAllCommand] })
  const display = spyDisplay(cli, 'echo-all')

  await cli.parse(createCliArgv('a', '--verbose', 'echo-all'))

  // console will still display the help messages
  t.is(display.debugLogs[0][0], 'echo-all')
  t.is(display.errorLogs[0][0], 'echo-all')
  t.is(display.infoLogs[0][0], 'echo-all')
  t.is(display.warnLogs[0][0], 'echo-all')
})
