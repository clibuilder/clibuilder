import test from 'ava'
import merge = require('lodash.merge')

import { Cli } from './index'

import * as commandSpecs from './test/commands'
import { createArgv } from './test/util'
import { InMemoryPresenter, InMemoryDisplay, generateDisplayedMessage } from './test/InMemoryDisplay'

test.beforeEach(() => {
  Cli.PresenterFactory = {
    createCliPresenter(options) { return new InMemoryPresenter(options) },
    createCommandPresenter(options) { return new InMemoryPresenter(options) }
  }
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
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv())

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-help'
then the help message will be shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('--help'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-h'
then the help message will be shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('-h'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`
given cli with noop command
when called with '--silent'
then the help message is shwon
`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('--silent'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with unknown command 'oh'
then the help message will be shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('oh'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-v'
then version will be shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.noopCommandSpec])
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('-v'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '0.0.0')
  })

test(`given cli with verbose command
when called with 'verbose'
then no message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.verboseCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose'))
    t.is(display.debugLogs.length, 0)
  })

test(`given cli with verbose command
when called with 'verbose --verbose'
then the verbosed message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.verboseCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with alias 'vb --verbose'
then the verbosed message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.verboseCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('vb', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with second alias 'detail --verbose'
then the verbosed message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.verboseCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('detail', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with 'verbose -V'
then the verbosed message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.verboseCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose', '-V'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with error command
when called with 'error --silent'
then no message is shown`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.errorCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('error', '--silent'))
    t.is(display.errorLogs.length, 0)
  })

test(`given cli with echo command
when called with 'echo -h'
then the help message for each is shwon`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.echoCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, `
Usage: cmd echo

  Echoing input arguments
`)
  })

test(`given cli with echo command
and echo command has its own display
when called with 'echo -h'
then the help message for each is shown on the echo command display
and not on the main display`,
  t => {
    const eSpec = merge({ PresenterClass: InMemoryPresenter }, commandSpecs.echoCommandSpec)
    const cli = new Cli('cmd', '0.0.0', [eSpec])
    const display: InMemoryDisplay = (cli as any).ui.display
    const echoDisplay: InMemoryDisplay = cli.commands[0].ui['display']

    cli.parse(createArgv('echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '')

    const eInfos = generateDisplayedMessage(echoDisplay.infoLogs)
    t.is(eInfos, `
Usage: cmd echo

  Echoing input arguments
`)
  })

test(`
given cli with echo command
when called with 'echo abc --some'
then will echo 'abc --some'
`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.echoCommandSpec])
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('echo', 'abc', '--some'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'echo abc --some')
  })

test(`
given cli with echoNameOption command
when called with 'eno --name=abc'
then will each 'abc'`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.echoNameOptionCommandSpec])
    const display = (cli.commands[0].ui as any).display as InMemoryDisplay

    cli.parse(createArgv('eno', '--name=abc'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'abc')
  })

test(`
given cli with echoNameOption command
when called with 'eno --name'
then will each 'abc'`,
  t => {
    const cli = new Cli('cmd', '0.0.0', [commandSpecs.echoNameOptionCommandSpec])
    const display = (cli.commands[0].ui as any).display as InMemoryDisplay

    cli.parse(createArgv('eno'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'abc')
  })
