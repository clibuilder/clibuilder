import { logLevel, getLevel } from '@unional/logging'
import AssertOrder from 'assertron'
import test from 'ava'

import { Cli, CliCommand, createCliArgv, InMemoryPresenter, echoAllCommand, PlainPresenter } from './index'
import { log } from './log'

test('Cli context shape should follow input literal', t => {
  const cli = new Cli({
    name: '',
    version: '',
    commands: []
  }, { cwd: '', abc: '123' })
  t.truthy(cli)

  const cli2 = new Cli({
    name: '',
    version: '',
    commands: []
  }, { abc: '123' })
  t.truthy(cli2)
})

test('run nested command', async t => {
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
          t.pass()
        }
      }]
    }]
  }, { cwd: '', abc: '123' })
  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd'))
})

test('run nested command with argument', async t => {
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
          t.deepEqual(args._, [])
          t.is(args.arg1, 'abc')
        }
      }]
    }]
  }, { cwd: '', abc: '123' })

  t.plan(2)
  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd', 'abc'))
})


test('support extending context', t => {
  const cli = new Cli({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'cmd',
      run() {
        t.not(this.custom, undefined)
      }
    } as CliCommand<undefined, { custom: boolean }>]
  }, { cwd: '', custom: true })
  return cli.parse(createCliArgv('cli', 'cmd'))
})

function createInquirePresenterFactory(answers) {
  return { createCommandPresenter: options => new InMemoryPresenter(options, answers) }
}

test('prompt for input', async t => {
  const presenterFactory = createInquirePresenterFactory({ username: 'me' })
  const cli = new Cli({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'ask',
      async run() {
        const answers = await this.ui.prompt([{ name: 'username', message: 'Your username' }])
        t.is(answers.username, 'me')
      }
    }]
  }, { presenterFactory })

  t.plan(1)
  await cli.parse(createCliArgv('cli', 'ask'))
})

// This is not testable because the flag has to be check and turn on logging before `Cli` is created. i.e. has to do it in initialization time.
test.skip('turn on debug-cli sets the log level to debug locally', async t => {
  const cli = new Cli({
    name: 'cli',
    version: '0.0.1',
    commands: [echoAllCommand]
  })

  await cli.parse(createCliArgv('cli', 'echo', '--debug-cli'))
  t.is(log.level, logLevel.debug)
  t.is(getLevel(), logLevel.none)
})

test('read local json file', async t => {
  const cli = new Cli({
    name: 'test-cli',
    version: '0.0.1',
    commands: [{
      name: 'cfg',
      run() {
        t.deepEqual(this.config, { a: 1 })
      }
    } as CliCommand<{ a: number }, {}>]
  }, { cwd: 'fixtures/has-config' })
  t.plan(1)
  await cli.parse(createCliArgv('cli', 'cfg'))
})

test(`read local json file in parent directory`, async t => {
  const cli = new Cli({
    name: 'test-cli',
    version: '0.0.1',
    commands: [{
      name: 'cfg',
      run() {
        t.deepEqual(this.config, { a: 1 })
      }
    } as CliCommand<{ a: number }, {}>]
  }, { cwd: 'fixtures/has-config/sub-folder' })
  t.plan(1)
  await cli.parse(createCliArgv('test-cli', 'cfg'))
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
        createCommandPresenter(options) {
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
