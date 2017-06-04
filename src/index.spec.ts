import test from 'ava'

import { create } from './index'

import { noopCommand } from './test/commands'

import { createArgv } from './test/util'
import { InMemoryDisplay } from './test/InMemoryDisplay'


test('create cli with no command', t => {
  const name = 'cmd'
  const display = new InMemoryDisplay()
  const cli = create({
    name,
    version: '0.0.0',
    commands: [noopCommand],
    display
  })

  cli.parse(createArgv())
  const infos = getMessage(display.infoMessages)
  t.deepEqual(infos, `
Usage: ${name} <command>

Commands:
  noop

${name} <command> -h      Get help for <command>

Options:
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
`)
})

function getMessage(messages) {
  return messages.map(m => m.join(' ')).join('\n')
}
