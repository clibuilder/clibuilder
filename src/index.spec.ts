import test from 'ava'

import { create } from './index'

import { noopCommand } from './test/commands'
import { createArgv } from './test/util'
import { InMemoryDisplay, generateDisplayedMessage } from './test/InMemoryDisplay'


test('given single command cli, when called with no argument, then help will be shown', t => {
  const display = new InMemoryDisplay()
  const cli = create({
    name: 'cmd',
    version: '0.0.0',
    commands: [noopCommand],
    display
  })

  cli.parse(createArgv())

  const infos = generateDisplayedMessage(display.infoMessages)
  t.deepEqual(infos, `
Usage: cmd <command>

Commands:
  noop

cmd <command> -h     Get help for <command>

Options:
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
`)
})
