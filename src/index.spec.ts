import test from 'ava'
import _ = require('lodash')

import { Cli } from './index'
import {
  createCliArgv,
  createInMemoryCli,
  InMemoryDisplay,
  InMemoryPresenter,
  spyDisplay,
  generateDisplayedMessage,
  noopCommand,
  verboseCommand,
  argCommand,
  echoCommand,
  errorCommand,
  echoNameOptionCommand,
  booleanOptionsCommand,
  groupOptionsCommand
} from './test-util'

const noopHelpMessage = `
Usage: cli <command>

Commands:
  noop

cli <command> -h         Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`

test(`given cli with noop command
when called with no argument
then help will be shown`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-help'
then the help message will be shown`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli', '--help'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-h'
then the help message will be shown`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli', '-h'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`
given cli with noop command
when called with '--silent'
then the help message is shwon
`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli', '--silent'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with unknown command 'oh'
then the help message will be shown`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli', 'oh'))

    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, noopHelpMessage)
  })

test(`given cli with noop command
when called with '-v'
then version will be shown`,
  async t => {
    const cli = createInMemoryCli('cli', noopCommand)
    const display: InMemoryDisplay = (cli as any).ui.display

    await cli.parse(createCliArgv('cli', '-v'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '1.0.0')
  })

test(`given cli with verbose command
when called with 'verbose'
then no message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', verboseCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'verbose'))
    t.is(display.debugLogs.length, 0)
  })

test(`given cli with verbose command
when called with 'verbose --verbose'
then the verbosed message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', verboseCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'verbose', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with alias 'vb --verbose'
then the verbosed message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', verboseCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'vb', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with second alias 'detail --verbose'
then the verbosed message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', verboseCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'detail', '--verbose'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with verbose command
when called with 'verbose -V'
then the verbosed message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', verboseCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'verbose', '-V'))
    t.is(display.debugLogs.length, 1)
  })

test(`given cli with error command
when called with 'error --silent'
then no message is shown`,
  async t => {
    const cli = createInMemoryCli('cli', errorCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'error', '--silent'))
    t.is(display.errorLogs.length, 0)
  })

test(`given cli with echo command
when called with 'echo -h'
then the help message for each is shwon`,
  async t => {
    const cli = createInMemoryCli('cli', echoCommand)
    const display: InMemoryDisplay = (cli.commands[0].ui as any).display

    await cli.parse(createCliArgv('cli', 'echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, `
Usage: cli echo

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
  async t => {
    const eSpec = _.merge({ PresenterClass: InMemoryPresenter }, echoCommand)
    const cli = createInMemoryCli('cli', eSpec)
    const display: InMemoryDisplay = (cli as any).ui.display
    const echoDisplay: InMemoryDisplay = cli.commands[0].ui['display']

    await cli.parse(createCliArgv('cli', 'echo', '-h'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, '')

    const eInfos = generateDisplayedMessage(echoDisplay.infoLogs)
    t.is(eInfos, `
Usage: cli echo

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
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [echoCommand] })
    const display = spyDisplay(cli, 'echo')

    await cli.parse(createCliArgv('cli', 'echo', 'abc'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'echo abc')
  })

test(`
given cli with echoNameOption command
when called with 'eno --name=abc'
then will echo 'abc'`,
  async t => {
    const cli = createInMemoryCli('cli', echoNameOptionCommand)
    const display = (cli.commands[0].ui as any).display as InMemoryDisplay

    await cli.parse(createCliArgv('cli', 'eno', '--name=abc'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'abc')
  })

test(`
given cli with echoNameOption command
when called with 'eno --name'
then will each 'abc'`,
  async t => {
    const cli = createInMemoryCli('cli', echoNameOptionCommand)
    const display = (cli.commands[0].ui as any).display as InMemoryDisplay

    await cli.parse(createCliArgv('cli', 'eno'))
    const infos = generateDisplayedMessage(display.infoLogs)
    t.is(infos, 'abc')
  })

test(`
  given cli with async comand
  when called with 'async'
  then can await on parse`,
  async t => {
    const cli = createInMemoryCli('cli', argCommand)
    await cli.parse(createCliArgv('cli', 'async'))
    t.pass()
  })

test(`
Given cli with arg command
when called with 'arg'
then show report missing argument`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [argCommand] })
    const display = spyDisplay(cli, 'arg')

    await cli.parse(createCliArgv('cli', 'arg'))

    const actual = generateDisplayedMessage(display.errorLogs)
    t.is(actual, 'Missing argument(s)')
  })

test(`
Given cli with arg command
when called with 'arg x'
then echo x`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [argCommand] })
    const display = spyDisplay(cli, 'arg')

    await cli.parse(createCliArgv('cli', 'arg', 'x'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'some-arg: x opt-arg: undefined')
  })

test(`
Given cli with opt command
When called with 'opt'
Then options 'a' is true and 'b' is false`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [booleanOptionsCommand] })
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createCliArgv('cli', 'opt'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: undefined')
  })

test(`
Given cli with opt command
When called with 'opt a'
Then options 'a' is true`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [booleanOptionsCommand]})
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createCliArgv('cli', 'opt', '-a'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: undefined')
  })

test(`
Given cli with opt command
When called with 'opt b'
Then options 'a' is true and 'b' is true`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [booleanOptionsCommand]})
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createCliArgv('cli', 'opt', '-b'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: true, b: true')
  })


test(`
Given cli with groupOption command
When called with 'opt b'
Then options 'a' is undefined and 'b' is true`,
  async t => {
    const cli = new Cli({ name: 'cli', version: '0.0.0', commands: [groupOptionsCommand]})
    const display = spyDisplay(cli, 'opt')

    await cli.parse(createCliArgv('cli', 'opt', '-b'))

    const actual = generateDisplayedMessage(display.infoLogs)
    t.is(actual, 'a: undefined, b: true')
  })
