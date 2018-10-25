import t from 'assert'

import { Cli, createCliArgv, echoAllCommand, spyDisplay, InMemoryPresenterFactory } from '..'

test('can spy on cli', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [] }, { presenterFactory })
  const display = spyDisplay(cli)

  await cli.parse(createCliArgv('a'))

  // console will still display the help messages
  t(display.infoLogs.length > 0)
})

test('can spy on cmd', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({ name: 'a', version: '0.0.0', commands: [echoAllCommand] }, { presenterFactory })
  const display = spyDisplay(cli, 'echo-all')

  await cli.parse(createCliArgv('a', '--verbose', 'echo-all'))

  // console will still display the help messages
  t.strictEqual(display.debugLogs[0][0], 'echo-all')
  t.strictEqual(display.errorLogs[0][0], 'echo-all')
  t.strictEqual(display.infoLogs[0][0], 'echo-all')
  t.strictEqual(display.warnLogs[0][0], 'echo-all')
})
