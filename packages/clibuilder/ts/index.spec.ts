// import t from 'assert'
// import a from 'assertron'
// import { argCommand, booleanOptionsCommand, echoCommand, echoNameOptionCommand, errorCommand, generateDisplayedMessage, groupOptionsCommand, noopCommand, verboseCommand } from './index.js'
// import { createCliTest, echoCommandHelpMessage, echoDebugCommand } from './test-util'
// import { MissingArguments } from './errors'

// const noopHelpMessage = `
// Usage: cli <command> [options]

// Commands:
//   noop

// cli <command> -h         Get help for <command>

// Options:
//   [-h|--help]            Print help message
//   [-v|--version]         Print the CLI version
//   [-V|--verbose]         Turn on verbose logging
//   [--silent]             Turn off logging
//   [--debug-cli]          Display clibuilder debug messages
// `

// test(`given cli with noop command
// when called with no argument
// then help will be shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] })
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, noopHelpMessage)
// })

// test(`given cli with noop command
// when called with '-help'
// then the help message will be shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] }, '--help')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, noopHelpMessage)
// })

// test(`given cli with noop command
// when called with '-h'
// then the help message will be shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] }, '-h')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, noopHelpMessage)
// })

// test(`
// given cli with noop command
// when called with '--silent'
// then the help message is shown
// `, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] }, '--silent')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, noopHelpMessage)
// })

// test(`given cli with noop command
// when called with unknown command 'oh'
// then the help message will be shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] }, 'oh')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, noopHelpMessage)
// })

// test(`given cli with noop command
// when called with '-v'
// then version will be shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [noopCommand] }, '-v')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, '1.0.0')
// })

// test(`given cli with verbose command
// when called without  '--verbose'
// then no message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [verboseCommand] }, 'verbose')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.debugLogs.length, 0)
// })

// test(`given cli with verbose command
// when called with 'verbose --verbose'
// then the verbose message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [verboseCommand] }, 'verbose', '--verbose')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.debugLogs.length, 1)
// })

// test(`given cli with verbose command
// when called with alias 'vb --verbose'
// then the verbose message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [verboseCommand] }, 'vb', '--verbose')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.debugLogs.length, 1)
// })

// test(`given cli with verbose command
// when called with second alias 'detail --verbose'
// then the verbose message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [verboseCommand] }, 'detail', '--verbose')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.debugLogs.length, 1)
// })

// test(`given cli with verbose command
// when called with 'verbose -V'
// then the verbose message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [verboseCommand] }, 'verbose', '-V')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.debugLogs.length, 1)
// })

// test(`given cli with error command
// when called with 'error --silent'
// then no message is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [errorCommand] }, 'error', '--silent')
//   await cli.parse(argv)

//   t.strictEqual(ui.display.errorLogs.length, 0)
// })

// test(`given cli with echo command
// when called with 'echo -h'
// then the help message for each is shown`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [echoCommand] }, 'echo', '-h')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, echoCommandHelpMessage)
// })

// test(`
// given cli with echo command
// when called with 'echo abc'
// then will echo 'abc'
// `, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [echoCommand] }, 'echo', 'abc')
//   await cli.parse(argv)

//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, 'echo abc')
// })

// test(`
// given cli with echoNameOption command
// when called with 'eno --name=abc'
// then will echo 'abc'`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [echoNameOptionCommand] }, 'eno', '--name=abc')
//   await cli.parse(argv)
//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, 'abc')
// })

// test(`
// given cli with echoNameOption command
// when called with 'eno --name'
// then will each 'abc'`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [echoNameOptionCommand] }, 'eno')
//   await cli.parse(argv)
//   const infos = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(infos, 'abc')
// })

// test(`
// Given cli with arg command
// when called with 'arg'
// then show report missing argument`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [argCommand] }, 'arg')

//   await a.throws(cli.parse(argv), MissingArguments)

//   const actual = generateDisplayedMessage(ui.display.errorLogs)
//   t.strictEqual(actual, 'Missing Argument. Expecting 1 but received 0.')
// })

// test(`
// Given cli with arg command
// when called with 'arg x'
// then echo x`, async () => {
//   const { cli, argv } = createCliTest({ commands: [argCommand] }, 'arg', 'x')
//   const actual = await cli.parse(argv)

//   a.satisfies(actual, { 'required-arg': 'x' })
// })

// test(`
// Given cli with opt command
// When called with 'opt'
// Then options 'a' is true and 'b' is false`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [booleanOptionsCommand] }, 'opt')
//   await cli.parse(argv)

//   const actual = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(actual, 'a: true, b: undefined')
// })

// test(`
// Given cli with opt command
// When called with 'opt a'
// Then options 'a' is true`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [booleanOptionsCommand] }, 'opt', '-a')
//   await cli.parse(argv)

//   const actual = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(actual, 'a: true, b: undefined')
// })

// test(`
// Given cli with opt command
// When called with 'opt b'
// Then options 'a' is true and 'b' is true`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [booleanOptionsCommand] }, 'opt', '-b')
//   await cli.parse(argv)

//   const actual = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(actual, 'a: true, b: true')
// })


// test(`
// Given cli with groupOption command
// When called with 'opt b'
// Then options 'a' is undefined and 'b' is true`, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [groupOptionsCommand] }, 'opt', '-b')
//   await cli.parse(argv)

//   const actual = generateDisplayedMessage(ui.display.infoLogs)
//   t.strictEqual(actual, 'a: undefined, b: true')
// })

// test(`
// Given cli with custom command presenter
// When called with '--verbose'
// Then command debug message is printed
// `, async () => {
//   const { cli, argv, ui } = createCliTest({ commands: [echoDebugCommand] }, 'echo-debug', 'abc', '--verbose')
//   await cli.parse(argv)

//   const actual = generateDisplayedMessage(ui.display.debugLogs)
//   t.strictEqual(actual, 'echo-debug abc')
// })
test.todo('no test yet')
