import a, { AssertOrder } from 'assertron';
import { assertType, assignability } from 'type-plus';
import { argCommand, createCliArgv, helloCommand, numberOptionCommand, InMemoryPresenter, InMemoryPresenterFactory, generateDisplayedMessage, echoCommand } from '../test-util';
import { Cli, CliOptions } from './Cli';
import { PresenterOption, PlainPresenter } from '../presenter';
import { NoConfig } from '.';
import { CliCommand } from '..';
import { Answers } from 'inquirer';

test('CliOptions requires either run() or commands', () => {
  assertType.isFalse(assignability<CliOptions<any, any>>()({
    name: 'direct-cli',
    version: '1.0.0',
  }))
})

test('show -v shows version', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', '-v'))
  const message = generateDisplayedMessage(presenterFactory.cliPresenter!.display.infoLogs)
  expect(message).toBe('1.0.0')
})

test('--version shows version', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', '--version'))
  const message = generateDisplayedMessage(presenterFactory.cliPresenter!.display.infoLogs)
  expect(message).toBe('1.0.0')
})

const helloHelpMessage = `
Usage: cli <command>

Commands:
  hello

cli <command> -h         Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`

test('-h shows help', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', '-h'))
  const message = generateDisplayedMessage(presenterFactory.cliPresenter!.display.infoLogs)
  expect(message).toBe(helloHelpMessage)
})

test('--help shows help', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', '--help'))
  const message = generateDisplayedMessage(presenterFactory.cliPresenter!.display.infoLogs)
  expect(message).toBe(helloHelpMessage)
})

test('no matching command shows help', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', 'not-exist'))
  const message = generateDisplayedMessage(presenterFactory.cliPresenter!.display.infoLogs)
  expect(message).toBe(helloHelpMessage)
})

test('--silent disables ui', async () => {
  const presenterFactory = new InMemoryPresenterFactory()
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [echoCommand],
    context: { presenterFactory },
  })
  await cli.parse(createCliArgv('cli', '--silent', 'echo', 'abc'))
  const message = generateDisplayedMessage(presenterFactory.commandPresenter!.display.infoLogs)
  expect(message).toBe('')
})


test('invoke command by name', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [helloCommand],
  })

  const actual = await cli.parse(createCliArgv('cli', 'hello'))

  expect(actual).toEqual('hello')
})

test('pass argument to command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [argCommand],
  })

  const actual = await cli.parse(createCliArgv('cli', 'arg', 'abc'))

  a.satisfies(actual, { 'required-arg': 'abc' })
})

test('pass options to command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [numberOptionCommand],
  })

  const actual = await cli.parse(createCliArgv('cli', 'number-option', '--value=123'))
  expect(actual).toBe(123)
})

test('invoke nested command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [{
      name: 'base',
      run() { throw new Error('should not reach') },
      commands: [helloCommand],
    }],
  })

  const actual = await cli.parse(createCliArgv('cli', 'base', 'hello'))
  expect(actual).toEqual('hello')
})

test('pass arguments to nested command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [{
      name: 'base',
      run() { throw new Error('should not reach') },
      commands: [argCommand],
    }],
  })

  const actual = await cli.parse(createCliArgv('cli', 'base', 'arg', 'abc'))
  a.satisfies(actual, { 'required-arg': 'abc' })
})

test('prompt for input', async () => {
  const o = new AssertOrder(1)
  const presenterFactory = createInquirePresenterFactory({ username: 'me' })
  const cli = new Cli({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'ask',
      async run() {
        const answers = await this.ui.prompt([{ name: 'username', message: 'Your username' }])
        expect(answers.username).toBe('me')
        o.once(1)
      },
    }],
    context: { presenterFactory },
  })

  await cli.parse(createCliArgv('cli', 'ask'))
  o.end()
})
function createInquirePresenterFactory(answers: Answers) {
  return { createCommandPresenter: (options: PresenterOption) => new InMemoryPresenter(options, answers) }
}

test('cli context passes down to command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        assertType.isString(this.context.abc)
        return this.context.abc
      },
    }],
    context: { abc: '123' },
  })
  expect(await cli.parse(createCliArgv('cli', 'cmd'))).toEqual('123')
})

test('context in command always contains `cwd`', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        // cwd is available even not specified
        assertType.isString(this.context.cwd)
        return this.context.cwd
      },
    }],
  })
  expect(await cli.parse(createCliArgv('cli', 'cmd'))).toEqual(process.cwd())
})


test('context in command does not have presenterFactory', async () => {
  new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        const context = this.context
        let y: Extract<typeof context, { presenterFactory: any }>
        assertType.isNever(y!)
      },
    }],
  })
})

describe('config', () => {
  test('read config file', async () => {
    const o = new AssertOrder(1)
    const cli = new Cli({
      name: 'test-cli',
      version: '0.0.1',
      defaultConfig: { a: 2 },
      commands: [{
        name: 'cfg',
        run() {
          expect(this.config).toEqual({ a: 1 })
          o.once(1)
        },
      }],
      context: {
        cwd: 'fixtures/has-config',
      },
    })
    await cli.parse(createCliArgv('test-cli', 'cfg'))
    o.end()
  })
  test(`read config file in parent directory`, async () => {
    const o = new AssertOrder(1)
    const cli = new Cli({
      name: 'test-cli',
      version: '0.0.1',
      defaultConfig: { a: 2 },
      commands: [{
        name: 'cfg',
        run() {
          expect(this.config).toEqual({ a: 1 })
          o.once(1)
        },
      }],
      context: { cwd: 'fixtures/has-config/sub-folder' },
    })

    await cli.parse(createCliArgv('test-cli', 'cfg'))

    o.end()
  })

  test(`default config is overriden by value in config file`, async () => {
    const o = new AssertOrder(1)
    const cli = new Cli({
      name: 'test-cli',
      version: '0.0.1',
      defaultConfig: { a: 2, b: 3 },
      commands: [{
        name: 'cfg',
        run() {
          expect(this.config).toEqual({ a: 1, b: 3 })
          o.once(1)
        },
      }],
      context: { cwd: 'fixtures/has-config' },
    })

    await cli.parse(createCliArgv('test-cli', 'cfg'))

    o.end()
  })
})

test('can partially override the presenter factory implementation', async () => {
  const o = new AssertOrder(1)
  const cli = new Cli(
    {
      name: 'test-cli',
      version: '',
      commands: [{
        name: 'cmd',
        run() {
          return
        },
      }],
      context: {
        presenterFactory: {
          createCommandPresenter(options: PresenterOption) {
            o.once(1)
            return new PlainPresenter(options)
          },
        },
      },
    })
  await cli.parse(createCliArgv('test-cli', 'cmd'))
  o.end()
})

test('command can specify its own ui', async () => {
  const o = new AssertOrder(1)
  const cli = new Cli(
    {
      name: 'test-cli',
      version: '',
      commands: [{
        name: 'a',
        run() {
          this.ui.info()
        },
        ui: (() => {
          const p = new PlainPresenter({ name: 'a' })
          p.info = () => o.once(1)
          return p
        })(),
      }],
    })
  await cli.parse(createCliArgv('test-cli', 'a'))
  o.end()
})

test('--debug-cli not pass to command', async () => {
  let actual
  const cli = new Cli({
    name: 'test-cli',
    version: '1.0',
    commands: [{
      name: 'a',
      run(_, argv) {
        actual = argv
      },
    }],
  })
  await cli.parse(createCliArgv('test-cli', 'a', '--debug-cli'))

  a.satisfies(actual, ['a'])
})

test('Can use commands with additional context (for dependency injection)', () => {
  const cmd1: CliCommand<NoConfig, { a: string, b: string }> = {
    name: 'cmd1',
    run() {
      assertType.noUndefined(this.context.a)
      assertType.noUndefined(this.context.b)
      return
    },
  }

  new Cli({
    name: 'cli',
    version: '1.0',
    context: { b: 'b' },
    commands: [cmd1, {
      name: 'cmd2',
      run() {
        // inline command still get completion on `this.context`
        assertType.noUndefined(this.context.b)
        return Promise.resolve(this.context.b === this.context.cwd)
      },
    }],
  })
})

describe('Runable Cli', () => {
  test('invoke the run method', async () => {
    const cli = new Cli({
      name: 'cli',
      version: '1.0.0',
      async run(_, argv) { return argv },
    })

    const actual = await cli.parse(createCliArgv('cli', 'miku'))
    expect(actual).toEqual(['cli', 'miku'])
  })

  test('arguments are processed', async () => {
    const cli = new Cli({
      name: 'cli',
      version: '1.0.0',
      arguments: [{
        name: 'singer',
      }],
      async run(args) { return args },
    })

    const actual = await cli.parse(createCliArgv('cli', 'miku'))
    a.satisfies(actual, { singer: 'miku' })
  })

  test('options are processed', async () => {
    const cli = new Cli({
      name: 'cli',
      version: '1.0.0',
      options: {
        string: {
          song: {
            description: 'name of the song',
          },
        },
      },
      async run(args) { return args },
    })

    const actual = await cli.parse(createCliArgv('cli', '--song=huh'))

    a.satisfies(actual, { song: 'huh' })
  })

  test('invoke run if no matching command', async () => {
    const cli = new Cli({
      name: 'cli',
      version: '1.0.0',
      commands: [helloCommand],
      async run(_, argv) { return argv },
    })

    const actual = await cli.parse(createCliArgv('cli', 'miku', 'dance'))
    expect(actual).toEqual(['cli', 'miku', 'dance'])
  })
})
