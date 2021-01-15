import { argv, getLogMessage } from '../test-utils'
import { cli } from './cli'
import { getBottomCommand } from './getBottomCommand'
import { mockAppContext } from './mockAppContext'
import { processArgv2 } from './processArgv'

const baseCommand = getBottomCommand('some description')
describe('with only base command', () => {
  function run(arg: string) {
    const ctx = mockAppContext('single-bin/bin.js')
    return processArgv2(ctx, [baseCommand], argv(arg))
  }
  test('no arg receives base command with help options', () => {
    const { command, args } = run('my-cli')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('--help', () => {
    const { command, args } = run('my-cli --help')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('-h', () => {
    const { command, args } = run('my-cli -h')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('--version', () => {
    const { command, args } = run('my-cli --version')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test('-v', () => {
    const { command, args } = run('my-cli -v')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test('--verbose', () => {
    const { command, args } = run('my-cli --verbose')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], verbose: true })
  })
  test('-V', () => {
    const { command, args } = run('my-cli -V')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], verbose: true })
  })
  test('--silent', () => {
    const { command, args } = run('my-cli --silent')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], silent: true })
  })
  test('--debug-cli', () => {
    const { command, args } = run('my-cli --debug-cli')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], 'debug-cli': true })
  })
})

describe('with default command', () => {
  test('no args gets the default command', () => {
    const defaultCommand = { name: '', run() { } }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
  })
  test('--version gets base command', () => {
    const defaultCommand = { name: '', run() { } }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --version'))
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test('default command with --help gets default command', () => {
    const defaultCommand = {
      name: '',
      options: {
        boolean: { help: { description: 'x' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --help'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('boolean options', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: { abc: { description: 'a' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with = syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: { abc: { description: 'a' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc=true'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with space syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: { abc: { description: 'a' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc false'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean options with alias', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: {
          abc: {
            alias: ['a'],
            description: 'a'
          }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli -a'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: {
          abc: { description: 'a', default: true }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default as false', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: {
          abc: { description: 'a', default: false }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean options with multiple values gets the last value', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        boolean: { abc: { description: 'a' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc=false, --abc=true'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('number options with = syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        number: {
          abc: { description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc=123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with space syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        number: {
          abc: { description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc 123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with alias', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        number: {
          abc: { alias: ['a'], description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli -a=123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with default', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        number: {
          abc: { default: 123, description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test.skip('boolean options with multiple values gets the last value and emit warning', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        number: { abc: { description: 'a' } }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc=2 --abc=3'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 3 })
    expect(getLogMessage(ctx.reporter)).toEqual(`get multiple 'abc' options. Only the last one is used`)
  })
  test('string options with = syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        string: {
          abc: { description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc=123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with space syntax', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        string: {
          abc: { description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli --abc 123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with alias', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        string: {
          abc: { alias: ['a'], description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli -a=123'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with default', () => {
    const defaultCommand: cli.Command = {
      name: '',
      options: {
        string: {
          abc: { default: '123', description: 'a' }
        }
      },
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('single argument', () => {
    const defaultCommand: cli.Command = {
      name: '',
      arguments: [{ name: 'arg' }],
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli abc'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: ['abc'] })
  })
  test.skip('multiple arguments', () => {
    const defaultCommand: cli.Command = {
      name: '',
      arguments: [{ name: 'arg' }],
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli abc def'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: ['abc'] })
  })
})
