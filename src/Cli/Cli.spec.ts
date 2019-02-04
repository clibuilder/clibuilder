import { getLevel, logLevel } from '@unional/logging';
import t from 'assert';
import a, { AssertOrder } from 'assertron';
import { Cli, createCliArgv, echoAllCommand, InMemoryPresenter, PlainPresenter } from '../index';
import { log } from '../log';
import { PresenterOption } from '../Presenter';
import inquirer = require('inquirer');


test('Cli context shape should follow input literal', () => {
  const cli = new Cli({
    name: '',
    version: '',
    commands: []
  }, { cwd: '', abc: '123' })
  t(cli)

  const cli2 = new Cli({
    name: '',
    version: '',
    commands: []
  }, { abc: '123' })
  t(cli2)
})

test('run nested command', async () => {
  const o = new AssertOrder(1)
  const cli = new Cli({
    name: 'clibuilder',
    version: '1.1.11',
    commands: [{
      name: 'cmd',
      run() {
        throw new Error('should not run')
      },
      commands: [{
        name: 'nested-cmd',
        run() {
          o.once(1)
        }
      }]
    }]
  }, { cwd: '', abc: '123' })
  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd'))
  o.end()
})

test('run nested command with argument', async () => {
  const o = new AssertOrder(1)
  const cli = new Cli({
    name: 'clibuilder',
    version: '1.1.11',
    commands: [{
      name: 'cmd',
      run() {
        throw new Error('should not run')
      },
      commands: [{
        name: 'nested-cmd',
        arguments: [{
          name: 'arg1',
          description: 'arg1 argument'
        }],
        run(args) {
          t.deepStrictEqual(args._, [])
          t.strictEqual(args.arg1, 'abc')
          o.once(1)
        }
      }]
    }]
  }, { cwd: '', abc: '123' })

  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd', 'abc'))
  o.end()
})

test('support extending context', () => {
  const cli = new Cli<never, { custom: boolean }>({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'cmd',
      run() {
        // `this.custom` does not report type error
        t.strictEqual(this.context.custom, true)
      }
    }]
  }, { cwd: '', custom: true })

  return cli.parse(createCliArgv('cli', 'cmd'))
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
        t.strictEqual(answers.username, 'me')
        o.once(1)
      }
    }]
  }, { presenterFactory })

  await cli.parse(createCliArgv('cli', 'ask'))
  o.end()
})

// This is not testable because the flag has to be check and turn on logging before `Cli` is created. i.e. has to do it in initialization time.
test.skip('turn on debug-cli sets the log level to debug locally', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '0.0.1',
    commands: [echoAllCommand]
  })

  await cli.parse(createCliArgv('cli', 'echo', '--debug-cli'))
  t.strictEqual(log.level, logLevel.debug)
  t.strictEqual(getLevel(), logLevel.none)
})

test('read local json file', async () => {
  const o = new AssertOrder(1)
  const cli = new Cli<{ a: number }>({
    name: 'test-cli',
    version: '0.0.1',
    commands: [{
      name: 'cfg',
      run() {
        t.deepStrictEqual(this.config, { a: 1 })
        o.once(1)
      }
    }]
  }, { cwd: 'fixtures/has-config' })
  await cli.parse(createCliArgv('cli', 'cfg'))
  o.end()
})

test(`read local json file in parent directory`, async () => {
  const o = new AssertOrder(1)
  const cli = new Cli<{ a: number }>({
    name: 'test-cli',
    version: '0.0.1',
    commands: [{
      name: 'cfg',
      run() {
        t.deepStrictEqual(this.config, { a: 1 })
        o.once(1)
      }
    }]
  }, { cwd: 'fixtures/has-config/sub-folder' })

  await cli.parse(createCliArgv('test-cli', 'cfg'))

  o.end()
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
        }
      }]
    },
    {
      presenterFactory: {
        createCommandPresenter(options: PresenterOption) {
          o.once(1)
          return new PlainPresenter(options)
        }
      }
    })
  await cli.parse(createCliArgv('test-cli', 'cmd'))
  o.end()
})

test('custom command level ui', async () => {
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
        })()
      }]
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
      }
    }]
  })
  await cli.parse(createCliArgv('test-cli', 'a', '--debug-cli'))

  a.satisfies(actual, ['a'])
})

function createInquirePresenterFactory(answers: inquirer.Answers) {
  return { createCommandPresenter: (options: PresenterOption) => new InMemoryPresenter(options, answers) }
}
