import test from 'ava'

import { create } from './index'

import { noopCommand } from './test/commands'
import { createArgv } from './test/util'
import { InMemoryDisplay, generateDisplayedMessage } from './test/InMemoryDisplay'

test.beforeEach(t => {
  t.context.display = new InMemoryDisplay()
})

test(`given single command cli
when called with no argument
then help will be shown`,
  t => {
    const { display } = t.context
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commands: [noopCommand],
      display
    })

    cli.parse(createArgv())

    const infos = generateDisplayedMessage(display.infoMessages)
    t.is(infos, `
Usage: cmd <command>

Commands:
  noop

cmd <command> -h         Get help for <command>

Options:
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
`)
  })

test(`given single command cli
when called with '-v'
then version will be shown`,
  t => {
    const { display } = t.context
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commands: [noopCommand],
      display
    })

    cli.parse(createArgv('-v'))
    const infos = generateDisplayedMessage(display.infoMessages)
    t.is(infos, '0.0.0')
  })
