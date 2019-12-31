import { setupCliTest } from '.'
import { Cli } from '..'
import { echoCommand } from './echoCommand'
import { generateDisplayedMessage } from './generateDisplayedMessage'

const cli = new Cli({
  name: 'cli',
  version: '',
  commands: [
    echoCommand,
    {
      name: 'nest',
      commands: [
        echoCommand,
      ],
    },
  ],
})

test('override cli ui if no command is specified', async () => {
  const { argv, ui } = setupCliTest(cli, ['-h'])
  await cli.parse(argv)
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toMatch(/Usage: cli <command>/)
})

test('override command ui', async() => {
  const { argv, ui } = setupCliTest(cli, ['echo', 'abc'])
  await cli.parse(argv)
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('echo abc')
})

test('override nested command ui', async() => {
  const { argv, ui } = setupCliTest(cli, ['nest', 'echo', 'abc'])
  await cli.parse(argv)
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('echo abc')
})
