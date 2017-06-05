import test from 'ava'

import { create } from './index'

import * as commandSpecs from './test/commands'
import { createArgv } from './test/util'
import { createInMemoryDisplay, InMemoryDisplay, generateDisplayedMessage } from './test/InMemoryDisplay'

test.beforeEach(t => {
  t.context.display = createInMemoryDisplay('bdd')
})

const noopHelpMessage = `
Usage: cmd <command>

Commands:
  noop

cmd <command> -h         Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
`

test(`given cli with noop command
when called with no argument
then help will be shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.noopCommandSpec],
      display
    })

    cli.parse(createArgv())

    const infos = generateDisplayedMessage(display.getInfoLogs())
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-help'
then the help message will be shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.noopCommandSpec],
      display
    })

    cli.parse(createArgv('--help'))

    const infos = generateDisplayedMessage(display.getInfoLogs())
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-h'
then the help message will be shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.noopCommandSpec],
      display
    })

    cli.parse(createArgv('-h'))

    const infos = generateDisplayedMessage(display.getInfoLogs())
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with unknown command 'oh'
then the help message will be shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.noopCommandSpec],
      display
    })

    cli.parse(createArgv('oh'))

    const infos = generateDisplayedMessage(display.getInfoLogs())
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-v'
then version will be shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.noopCommandSpec],
      display
    })

    cli.parse(createArgv('-v'))
    const infos = generateDisplayedMessage(display.getInfoLogs())
    t.is(infos, '0.0.0')
  })

test(`given cli with verbose command
when called with 'verbose'
then no message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.verboseCommandSpec],
      display
    })

    cli.parse(createArgv('verbose'))
    t.is(display.getDebugLogs().length, 0)
  })

test(`given cli with verbose command
when called with 'verbose --verbose'
then the verbosed message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.verboseCommandSpec],
      display
    })

    cli.parse(createArgv('verbose', '--verbose'))
    t.is(display.getDebugLogs().length, 1)
  })

test(`given cli with verbose command
when called with alias 'vb --verbose'
then the verbosed message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.verboseCommandSpec],
      display
    })

    cli.parse(createArgv('vb', '--verbose'))
    t.is(display.getDebugLogs().length, 1)
  })

test(`given cli with verbose command
when called with second alias 'detail --verbose'
then the verbosed message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.verboseCommandSpec],
      display
    })

    cli.parse(createArgv('detail', '--verbose'))
    t.is(display.getDebugLogs().length, 1)
  })


test(`given cli with verbose command
when called with 'verbose -V'
then the verbosed message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.verboseCommandSpec],
      display
    })

    cli.parse(createArgv('verbose', '-V'))
    t.is(display.getDebugLogs().length, 1)
  })

test(`given cli with error command
when called with 'error --silent'
then no message is shown`,
  t => {
    const display: InMemoryDisplay = t.context.display
    const cli = create({
      name: 'cmd',
      version: '0.0.0',
      commandSpecs: [commandSpecs.errorCommandSpec],
      display
    })

    cli.parse(createArgv('error', '--silent'))
    t.is(display.getErrorLogs().length, 0)
  })
