import { getLevel, logLevel } from '@unional/logging';
import t from 'assert';
import a, { AssertOrder } from 'assertron';
import { Cli } from '.';
import { log } from '../log';
import { PlainPresenter, PresenterOption } from '../presenter';
import { createCliArgv, echoAllCommand, InMemoryPresenter, echoCommand } from '../test-util';
import inquirer = require('inquirer');
import { CliCommand } from '../cli-command';
import { typeAssert } from 'type-plus';

test('create cli needs to specify at least: name, version, and commands', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [echoCommand]
  })

  t(cli)
})

test('arguments are passed to the command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '1.0.0',
    commands: [echoCommand]
  })

  const actual = await cli.parse(createCliArgv('cli', 'echo', 'xyz'))

  expect(actual).toEqual(['echo', 'xyz'])
})

test('cli commands can be nested', async () => {
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
        async run() {
          return 'nested'
        }
      }]
    }]
  })

  const actual = await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd'))

  t(actual, 'nested')
})


test('run nested command with arguments', async () => {
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
          // arg1 is parsed out of the argument list
          t.deepStrictEqual(args._, [])

          t.strictEqual(args.arg1, 'abc')
          o.once(1)
        }
      }]
    }]
  })

  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd', 'abc'))
  o.end()
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

test('cli context passes down to command', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        typeAssert.isString(this.context.abc)
        return this.context.abc
      }
    }]
  }, { abc: '123' })
  t.strictEqual(await cli.parse(createCliArgv('cli', 'cmd')), '123')
})

test('context in command always contain `cwd`', async () => {
  const cli = new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        // cwd is available even not specified
        typeAssert.isString(this.context.cwd)
        return this.context.cwd
      }
    }]
  })
  t.strictEqual(await cli.parse(createCliArgv('cli', 'cmd')), process.cwd())
})

test('context in command does not have presenterFactory', async () => {
  t(new Cli({
    name: 'cli',
    version: '',
    commands: [{
      name: 'cmd',
      async run() {
        const context = this.context
        let y: Extract<typeof context, { presenterFactory: any }> = context as never
        typeAssert.isNever(y)
      }
    }]
  }))
})

// This is not testable because the flag has to be check and turn on logging before `Cli` is created. i.e. has to do it in initialization phase.
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

test('read config file', async () => {
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

test(`read config file in parent directory`, async () => {
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


test(`default config is overriden by value in config file`, async () => {
  const o = new AssertOrder(1)
  const cli = new Cli({
    name: 'test-cli',
    version: '0.0.1',
    defaultConfig: { a: 2, b: 3 },
    commands: [{
      name: 'cfg',
      run() {
        t.deepStrictEqual(this.config, { a: 1, b: 3 })
        o.once(1)
      }
    }]
  }, { cwd: 'fixtures/has-config' })

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
    }, {
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

test('Can use commands with additional context (for dependency injection)', () => {
  const cmd1: CliCommand<any, { a: string, b: string }> = {
    name: 'cmd1',
    run() {
      typeAssert.noUndefined(this.context.a)
      typeAssert.noUndefined(this.context.b)
      return
    }
  }

  t(new Cli<any, { b: string }>({
    name: 'cli',
    version: '1.0',
    commands: [cmd1, {
      name: 'cmd2',
      run() {
        // inline command still get completion on `this.context`
        typeAssert.noUndefined(this.context.b)
        return Promise.resolve(this.context.b === this.context.cwd)
      }
    }]
  }))
})

function createInquirePresenterFactory(answers: inquirer.Answers) {
  return { createCommandPresenter: (options: PresenterOption) => new InMemoryPresenter(options, answers) }
}
