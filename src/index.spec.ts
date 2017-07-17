import test from 'ava'
import merge = require('lodash.merge')

import { Cli } from './index'

import * as commandSpecs from './test/commands'
import { createArgv, createFakeCli, spyDisplay } from './test/util'
import { InMemoryPresenter, InMemoryDisplay, generateDisplayedMessage } from './test/InMemoryDisplay'


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
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv())

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-help'
then the help message will be shown`,
  t => {
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('--help'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-h'
then the help message will be shown`,
  t => {
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
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
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('--silent'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with unknown command 'oh'
then the help message will be shown`,
  t => {
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('oh'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-v'
then version will be shown`,
  t => {
    const cli = createFakeCli(commandSpecs.noopCommandSpec)
    const display: InMemoryDisplay = (cli as any).ui.display

    cli.parse(createArgv('-v'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '0.0.0')
  })

test(`given cli with verbose command
when called with 'verbose'
then no message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.verboseCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose'))
    t.is(display.debugLogs.length, 0)
  })

test(`given cli with verbose command
when called with 'verbose --verbose'
then the verbosed message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.verboseCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with alias 'vb --verbose'
then the verbosed message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.verboseCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('vb', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with second alias 'detail --verbose'
then the verbosed message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.verboseCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('detail', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with 'verbose -V'
then the verbosed message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.verboseCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('verbose', '-V'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with error command
when called with 'error --silent'
then no message is shown`,
  t => {
    const cli = createFakeCli(commandSpecs.errorCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('error', '--silent'))
    t.is(display.errorLogs.length, 0)
  })

test(`given cli with echo command
when called with 'echo -h'
then the help message for each is shwon`,
  t => {
    const cli = createFakeCli(commandSpecs.echoCommandSpec)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    cli.parse(createArgv('echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, `
Usage: cmd echo

  Echoing input arguments

Arguments:
  [args]                 any argument(s)
`)
  })

test(`given cli with echo command
and echo command has its own display
when called with 'echo -h'
then the help message for each is shown on the echo command display
and not on the main display`,
  t => {
    const eSpec = merge({ PresenterClass: InMemoryPresenter }, commandSpecs.echoCommandSpec)
    const cli = createFakeCli(eSpec)
    const display: InMemoryDisplay = (cli as any).ui.display
    const echoDisplay: InMemoryDisplay = cli.commands[0].ui['display']

    cli.parse(createArgv('echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '')

    const eInfos = generateDisplayedMessage(echoDisplay.infoLogs)
    t.is(eInfos, `
Usage: cmd echo

  Echoing input arguments

Arguments:
  [args]                 any argument(s)
`)
  })

test(`
given cli with echo command
when called with 'echo abc'
then will echo 'abc'
`,
  t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.echoCommandSpec])
    const display = spyDisplay(cli, 'echo')

    cli.parse(createArgv('echo', 'abc'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'echo abc')
  })

test(`
given cli with echoNameOption command
when called with 'eno --name=abc'
then will echo 'abc'`,
  t => {
    const cli = createFakeCli(commandSpecs.echoNameOptionCommandSpec)
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
    const cli = createFakeCli(commandSpecs.echoNameOptionCommandSpec)
    const display = (cli.commands[0].ui as any).display as InMemoryDisplay

    cli.parse(createArgv('eno'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'abc')
  })

test(`
  given cli with async comand
  when called with 'async'
  then can await on parse`,
  async t => {
    const cli = createFakeCli(commandSpecs.asyncCommandSpec)
    await cli.parse(createArgv('async'))
    t.pass()
  })

test(`
Given cli with arg command
when called with 'arg'
then show report missing argument`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.argCommandSpec])
    const display = spyDisplay(cli, 'arg')

    await cli.parse(createArgv('arg'))

    const actual = generateDisplayedMessage(display.errorLogs)
    t.is(actual, 'Missing argument(s)')
  })

test(`
Given cli with arg command
when called with 'arg x'
then echo x`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.argCommandSpec])
    const display = spyDisplay(cli, 'arg')

    await cli.parse(createArgv('arg', 'x'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'x')
  })

test(`
Given cli with noop command
When setting 'cli.cwd' after the cli is created
Then the 'noopCommand.cwd' should be updated too`,
  t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.noopCommandSpec])

    cli.cwd = `fake`

    t.is(cli.commands[0].cwd, 'fake')
  })

test(`
Given cli with opt command
When called with 'opt'
Then options 'a' is true and 'b' is false`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.optionsCommand])
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createArgv('opt'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: false')
  })

test(`
Given cli with opt command
When called with 'opt a'
Then options 'a' is true and 'b' is false`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.optionsCommand])
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createArgv('opt', '-a'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: false')
  })

test(`
Given cli with opt command
When called with 'opt b'
Then options 'a' is true and 'b' is true`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.optionsCommand])
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createArgv('opt', '-b'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: true')
  })


test(`
Given cli with groupOption command
When called with 'opt b'
Then options 'a' is false and 'b' is true`,
  async t => {
    const cli = new Cli('cli', '0.0.0', [commandSpecs.groupOptionsCommand])
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createArgv('opt', '-b'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: false, b: true')
  })
