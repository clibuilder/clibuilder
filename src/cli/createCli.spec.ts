import a from 'assertron'
import { assertType, assignability } from 'type-plus'
import { Cli, createCli } from '.'
import { ProcessError } from '../errors'
import { argCommand, createCliTest, generateDisplayedMessage, helloCommand, nestedCommand, nestedHelpMessage, numberOptionCommand, rejectCommand, throwCommand } from '../test-util'

const helloHelpMessage = `
Usage: cli <command> [options]

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

test('Cli2.ConstructOptions requires either run() or commands', () => {
  assertType.isFalse(assignability<Cli.ConstructOptions<any, any, any, any, any, any>>()({
    name: 'direct-cli',
    version: '1.0.0',
  }))

  assertType.isTrue(assignability<Cli.ConstructOptions<any, any, any, any, any, any>>()({
    name: 'direct-cli',
    version: '1.0.0',
    description: '',
    run() { }
  }))

  assertType.isTrue(assignability<Cli.ConstructOptions<any, any, any, any, any, any>>()({
    name: 'direct-cli',
    version: '1.0.0',
    commands: []
  }))
})

test('-v shows version', async () => {
  createCli({
    name: '',
    version: '',
    description: '',
    run() { }
  })

  createCli({
    name: '',
    version: '',
    description: '',
    config: { a: 1 },
    run() {
      this.config.a
    }
  })

  const { cli, argv, ui } = createCliTest({
    description: '',
    run() { }
  }, '-v')
  await cli.parse(argv);
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('1.0.0')
})

test('--version shows version', async () => {
  const { cli, argv, ui } = createCliTest({
    description: '',
    run() { }
  }, '--version')
  await cli.parse(argv);
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('1.0.0')
})

const runnableCliHelpMessage = `
Usage: cli [options]

  test cli

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
test('-h shows help', async () => {
  const { cli, argv, ui } = createCliTest({
    description: 'test cli',
    run() { }
  }, '-h')
  await cli.parse(argv);
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe(runnableCliHelpMessage)
})

test('--help shows help', async () => {
  const { cli, argv, ui } = createCliTest({
    description: 'test cli',
    run() { }
  }, '--help')
  await cli.parse(argv);
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe(runnableCliHelpMessage)
})

test('--silent disables ui', async () => {
  const { cli, argv, ui } = createCliTest({
    description: '',
    run() { this.ui.info('should not print') }
  }, '--silent')
  await cli.parse(argv)
  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('')
})

describe('cli without command', () => {
  test('must specify name and version', () => {
    const cli = createCli({
      name: 'cli',
      version: '1.0.0',
      description: 'runnable cli also needs description',
      run() { }
    })
    expect(cli.name).toBe('cli')
    expect(cli.version).toBe('1.0.0')
  })

  test('run(_, argv) receives argv without "node"', () => {
    expect.assertions(1)

    const { cli } = createCliTest({
      description: '',
      run(_, argv) { expect(argv).toEqual(['cli']) }
    })

    return cli.parse(['node', 'cli'])
  })

  test('run(args) receives `_defaults` array', () => {
    const { cli, argv } = createCliTest({
      description: '',
      options: {
        number: {
          abc: {
            description: 'abc with default',
            default: 123
          }
        }
      },
      run(args) {
        expect(args.abc).toBe(123)
        expect(args._defaults).toEqual(['abc'])
      }
    })

    return cli.parse(argv)
  })

  test('specify argument', () => {
    const { cli, argv } = createCliTest({
      description: '',
      arguments: [{ name: 'arg1' }, { name: 'arg2' }],
      run(args) {
        assertType<string | undefined>(args.arg1)
        assertType<string | undefined>(args.arg2)
        expect(args.arg1).toEqual('value1')
        expect(args.arg2).toEqual('value2')
      }
    }, 'value1', 'value2')

    return cli.parse(argv)
  })

  test.skip('multi-argument has type string[]', () => {
    const { cli, argv } = createCliTest({
      description: '',
      arguments: [{ name: 'arg1' }, { name: 'arg2', multiple: true }],
      run(args) {
        assertType<string | undefined>(args.arg1)
        // limitation
        assertType<string[]>(args.arg2 as unknown as string[])
        expect(args.arg1).toEqual('value1')
        expect(args.arg2).toEqual(['value2', 'value3'])
      }
    }, 'value1', 'value2', 'value3')

    return cli.parse(argv)
  })

  test('not required argument can be undefined', () => {
    const { cli, argv } = createCliTest({
      description: '',
      arguments: [{ name: 'arg1' }],
      run(args) {
        assertType<string | undefined>(args.arg1)
        expect(args.arg1).toEqual(undefined)
      }
    })

    return cli.parse(argv)
  })

  test('specify options', () => {
    const { cli, argv } = createCliTest({
      description: '',
      options: {
        boolean: {
          option1: {
            description: 'option 1'
          }
        },
        string: {
          option2: {
            description: 'option 2'
          }
        },
        number: {
          option3: {
            description: 'option 3'
          }
        }
      },
      run(args) {
        assertType<boolean | undefined>(args.option1)
        assertType<string | undefined>(args.option2)
        assertType<number | undefined>(args.option3)

        expect(args.option1).toBe(true)
      }
    }, '--option1')

    cli.parse(argv)
  })

  test('ui.debug by default does not emit', async () => {
    const { cli, argv, ui } = createCliTest({
      description: '',
      run() { this.ui.debug('should not print') }
    })

    await cli.parse(argv)
    const message = generateDisplayedMessage(ui.display.debugLogs)
    expect(message).toBe('')
  })

  test('--verbose enables debug log', async () => {
    const { cli, argv, ui } = createCliTest({
      description: '',
      run() { this.ui.debug('should print') }
    }, '--verbose')

    await cli.parse(argv)
    const message = generateDisplayedMessage(ui.display.debugLogs)
    expect(message).toBe('should print')
  })

  test('--debug-cli not pass to run', async () => {
    const { cli, argv } = createCliTest({
      description: '',
      run(args) {
        expect(args['debug-cli']).toBeUndefined()
      }
    }, '--debug-cli')
    await cli.parse(argv)
  })

  test('--verbose not pass to run', async () => {
    const { cli, argv } = createCliTest({
      description: '',
      run(args) {
        expect(args['verbose']).toBeUndefined()
      }
    }, '--verbose')
    await cli.parse(argv)
  })

  test('--silent not pass to run', async () => {
    const { cli, argv } = createCliTest({
      description: '',
      run(args) {
        expect(args['silent']).toBeUndefined()
      }
    }, '--silent')
    await cli.parse(argv)
  })

  test('--version not pass to run', async () => {
    const { cli, argv } = createCliTest({
      description: '',
      run(args) {
        expect(args['version']).toBeUndefined()
      }
    }, '--version')
    await cli.parse(argv)
  })

  test('prompt for input', async () => {
    const { cli, argv, ui } = createCliTest({
      description: '',
      async run() {
        const answers = await this.ui.prompt([{
          type: 'text',
          name: 'username',
          message: 'Your username'
        }])
        expect(answers.username).toBe('me')
      }
    }, '--version')
    ui.answers = { username: 'me' }

    await cli.parse(argv)
  })

  test('emit error when cli throws an error', async () => {
    const { cli, argv, ui } = createCliTest({
      run() {
        throw new Error('some error')
      }
    })

    await a.throws(cli.parse(argv))

    const msg = generateDisplayedMessage(ui.display.errorLogs)

    expect(msg).toEqual(`cli throws: Error: some error`)
  })

  test('emit error when async cli throws an error', async () => {
    const { cli, argv, ui } = createCliTest({
      async run() {
        throw new Error('some error')
      }
    })

    await a.throws(cli.parse(argv))

    const msg = generateDisplayedMessage(ui.display.errorLogs)

    expect(msg).toEqual(`cli throws: Error: some error`)
  })

  test('wait for async run to complete', async () => {
    expect.assertions(1)
    const { cli, argv } = createCliTest({
      run() {
        return new Promise(a => {
          setTimeout(() => {
            expect(true).toBe(true)
            a()
          }, 10)
        })
      }
    })

    await cli.parse(argv)
  })
})

describe('cli with commands', () => {
  test('no matching command shows help', async () => {
    const { cli, argv, ui } = createCliTest({
      commands: [helloCommand as any],
    }, 'not-exist')

    await cli.parse(argv)
    const errors = generateDisplayedMessage(ui.display.errorLogs)
    expect(errors).toBe(`Unknown command: not-exist`)
    const info = generateDisplayedMessage(ui.display.infoLogs)
    expect(info).toBe(helloHelpMessage)
  })

  test('command without run shows help', async () => {
    const { cli, argv, ui } = createCliTest({
      commands: [nestedCommand as any],
    }, 'nested')

    await cli.parse(argv)
    const info = generateDisplayedMessage(ui.display.infoLogs)
    expect(info).toBe(nestedHelpMessage)
  })

  test('invoke run if no matching command', async () => {
    const { cli, argv } = createCliTest({
      description: '',
      arguments: [{ name: 'arg1', multiple: true }],
      async run(_, argv) { return argv },
    }, 'miku', 'dance')

    const actual = await cli.parse(argv)
    expect(actual).toEqual(['cli', 'miku', 'dance'])
  })

  test('--silent disables ui', async () => {
    const { cli, argv, ui } = createCliTest({
      commands: [helloCommand as any]
    }, '--silent', 'hello')
    await cli.parse(argv)
    const message = generateDisplayedMessage(ui.display.infoLogs)
    expect(message).toBe('')
  })

  test('still works when cli level arguments are placed before command', async () => {
    const { cli, argv } = createCliTest({
      commands: [numberOptionCommand as any]
    }, '--verbose', '--silent', 'number-option', '--value=3')
    const actual = await cli.parse(argv)
    a.satisfies(actual, { value: 3 })
  })

  test('invoke command by name', async () => {
    const { cli, argv } = createCliTest({
      commands: [helloCommand as any]
    }, 'hello')
    const actual = await cli.parse(argv)
    expect(actual).toEqual('hello')
  })

  test('pass argument to command', async () => {
    const { cli, argv } = createCliTest({
      commands: [argCommand as any]
    }, 'arg', 'abc')
    const actual = await cli.parse(argv)
    a.satisfies(actual, { 'required-arg': 'abc' })
  })

  test('pass options to command', async () => {
    const { cli, argv } = createCliTest({
      commands: [numberOptionCommand as any]
    }, 'number-option', '--value=123')
    const actual = await cli.parse(argv)
    a.satisfies(actual, { value: 123 })
  })

  test('invoke nested command', async () => {
    const { cli, argv } = createCliTest({
      commands: [{
        name: 'base',
        description: '',
        run() { new Error('should not reach') },
        commands: [helloCommand as any],
      }],
    }, 'base', 'hello')
    const actual = await cli.parse(argv)
    expect(actual).toEqual('hello')
  })

  test('pass arguments to nested command', async () => {
    const { cli, argv } = createCliTest({
      commands: [{
        name: 'base',
        description: '',
        run() { throw new Error('should not reach') },
        commands: [argCommand as any],
      }],
    }, 'base', 'arg', 'abc')
    const actual = await cli.parse(argv)

    a.satisfies(actual, { 'required-arg': 'abc' })
  })

  test('prompt for input', async () => {
    expect.assertions(1)
    const { cli, argv, ui } = createCliTest({
      commands: [{
        name: 'ask',
        description: '',
        async run() {
          const answers = await this.ui.prompt([{
            type: 'text',
            name: 'username',
            message: 'Your username'
          }])
          expect(answers.username).toBe('me')
        },
        commands: [argCommand as any],
      }],
    }, 'ask')
    ui.answers = { username: 'me' }
    await cli.parse(argv)
  })

  test('cli context passes down to command', async () => {
    const { cli, argv } = createCliTest({
      context: { abc: '123' },
      commands: [{
        name: 'cmd',
        description: '',
        async run() {
          assertType.isString(this.abc)
          return this.abc
        },
      }],
    }, 'cmd')
    const actual = await cli.parse(argv)

    expect(actual).toEqual('123')
  })

  test('command can specify the context it is expecting', async () => {
    const cmd: Cli.Command<undefined, { a: number }> = {
      name: 'cmd1',
      description: '',
      run() {
        assertType.noUndefined(this.a)
        return this.a
      }
    }

    const { cli, argv } = createCliTest({
      context: { a: 3 },
      commands: [cmd]
    }, 'cmd1')

    const actual = await cli.parse(argv)
    expect(actual).toBe(3)
  })

  test('command throws will throw the error at cli level', async () => {
    const { cli, argv, ui } = createCliTest({ commands: [throwCommand] }, 'throw', 'some error')

    const err = await a.throws(cli.parse(argv))

    const msg = generateDisplayedMessage(ui.display.errorLogs)
    expect(err.message).toEqual('some error')
    expect(msg).toEqual('command throw throws: Error: some error')
  })

  test('command reject will throw the error at cli level', async () => {
    const { cli, argv, ui } = createCliTest({ commands: [rejectCommand] }, 'reject', 'some error')

    const err = await a.throws(cli.parse(argv))

    const msg = generateDisplayedMessage(ui.display.errorLogs)
    expect(err.message).toEqual('some error')
    expect(msg).toEqual('command reject throws: Error: some error')
  })
})

describe('config', () => {
  test('config is available as property', async () => {
    const { cli, argv } = createCliTest({
      config: { a: 2 },
      run() {
        assertType<{ a: number }>(this.config)
        return this.config
      }
    })
    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 2 })
  })

  test.skip('config is not available in run context when not specified in the option', async () => {
    createCliTest({
      description: '',
      run() {
        // https://github.com/microsoft/TypeScript/issues/36005
        // there is a bug in TypeScript to prevent me from properly eliminate this property,
        // when it is not defined in the `ConstructOptions`.
        // assertType.isUndefined(this.config)
      }
    })
  })

  test('load config', async () => {
    const { cli, argv } = createCliTest({
      name: 'test-cli',
      description: '',
      config: { a: 2 },
      context: { cwd: 'fixtures/has-config' },
      run() { return this.config }
    })
    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 1 })
  })

  test('load config if specify configName', async () => {
    const { cli, argv } = createCliTest({
      name: 'test-cli',
      description: '',
      configName: 'test-cli',
      context: { cwd: 'fixtures/has-config' },
      run() { return this.config }
    })
    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 1 })
  })

  test(`read config file in parent directory`, async () => {
    const { cli, argv } = createCliTest({
      name: 'test-cli',
      config: { a: 2 },
      context: { cwd: 'fixtures/has-config/sub-folder' },
      description: '',
      run() {
        expect(this.config).toEqual({ a: 1 })
      },
    })

    await cli.parse(argv)
  })

  test(`default config is overriden by value in config file`, async () => {
    const { cli, argv } = createCliTest({
      name: 'test-cli',
      config: { a: 2, b: 3 },
      context: { cwd: 'fixtures/has-config' },
      description: '',
      run() {
        expect(this.config).toEqual({ a: 1, b: 3 })
      },
    })

    await cli.parse(argv)
  })

  test('use different config name', async () => {
    const { cli, argv } = createCliTest({
      name: 'another-cli',
      config: { a: 2 },
      configName: 'test-cli',
      context: { cwd: 'fixtures/has-config' },
      description: '',
      run() {
        expect(this.config).toEqual({ a: 1 })
      },
    })

    await cli.parse(argv)
  })
});

test('exit with specific error code for cli run()', async () => {
  const { argv, cli } = createCliTest({
    run() {
      throw new ProcessError('abc', 2)
    }
  })
  await cli.parse(argv)

  expect(process.exitCode).toBe(2)
})

test('exit with specific error code for cmd run()', async () => {
  const { argv, cli } = createCliTest({
    commands: [{
      name: 'throw',
      run() {
        throw new ProcessError('abc', 3)
      }
    } as any]
  }, 'throw')
  await cli.parse(argv)

  expect(process.exitCode).toBe(3)
})
