import * as z from 'zod'
import { argv } from '../test-utils'
import { command } from './command'
import { getBaseCommand } from './getBaseCommand'
import { processArgv } from './processArgv2'

const baseCommand = getBaseCommand('some description')

function testProcessArgv(commands: command.Command[], arg: string) {
  return processArgv(baseCommand, commands, argv(arg))
}

describe('with only base command', () => {
  test('---x is invalid', () => {
    const { errors } = testProcessArgv([], 'my-cli ---x')
    expect(errors).toEqual([{ type: 'invalid-key', key: '-x' }])
  })
  test('--version', () => {
    const { command, args } = testProcessArgv([], 'my-cli --version')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test.only('-v', () => {
    const { command, args } = testProcessArgv([], 'my-cli -v')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test('--help', () => {
    const { command, args } = testProcessArgv([], 'my-cli --help')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('-h', () => {
    const { command, args } = testProcessArgv([], 'my-cli -h')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('--verbose', () => {
    const { command, args } = testProcessArgv([], 'my-cli --verbose')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], verbose: true })
  })
  test('-V', () => {
    const { command, args } = testProcessArgv([], 'my-cli -V')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], verbose: true })
  })
  test('--silent', () => {
    const { command, args } = testProcessArgv([], 'my-cli --silent')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], silent: true })
  })
  test('--debug-cli', () => {
    const { command, args } = testProcessArgv([], 'my-cli --debug-cli')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], 'debug-cli': true })
  })
  test('no arg receives base command with help options', () => {
    const { command, args } = testProcessArgv([], 'my-cli')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], help: true })
  })
})
describe('with default command', () => {
  test('--version gets base command', () => {
    const defaultCommand = { name: '', run() { } }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --version')
    expect(command).toBe(baseCommand)
    expect(args).toEqual({ _: [], version: true })
  })
  test('no args gets the default command', () => {
    const defaultCommand = { name: '', run() { } }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
  })
  test('default command with --help gets default command', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        help: { type: z.boolean(), description: 'x' }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --help')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('with one argument', () => {
    const defaultCommand: command.Command = {
      name: '',
      arguments: [{ name: 'arg', type: z.string(), description: 'some arg' }],
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli abc')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: ['abc'] })
  })
})
describe('argument', () => {
  test('argument can be optional', () => {
    const defaultCommand: command.Command = {
      name: '',
      arguments: [{ name: 'arg', type: z.string().optional(), description: 'some arg' }],
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
  })
  test('required argument', () => {
    const defaultCommand: command.Command = {
      name: '',
      arguments: [{ name: 'arg', type: z.string(), description: 'some required arg' }],
      run() { }
    }
    const { command, args, errors } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
    expect(errors).toEqual([{ type: 'missing-argument', name: 'arg' }])
  })
})
describe('boolean options', () => {
  test('accepts true/false', () => {
    const { args } = testProcessArgv([], 'my-cli -h false, -v true')
    expect(args).toEqual({ _: [], help: false, version: true })
  })
  test('other strings are invalid', () => {
    const { errors } = testProcessArgv([], 'my-cli -h x')
    expect(errors).toEqual([{ type: 'invalid-value-type', key: 'h', keyType: z.boolean(), value: 'x' }])
  })
  test('boolean options with space syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { description: 'a', type: z.boolean() } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with = syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc=true')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with space syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc false')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean options with alias', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', alias: ['a'] }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli -a')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', default: true }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default as false', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', default: false }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean array options', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.array(z.boolean()), description: 'a' }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc=true --abc=true')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: [true, true] })
  })
  test('boolean options pass in multiple values gets the last value and emit warning', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    }
    const { command, args, errors } = testProcessArgv([defaultCommand], 'my-cli --abc=false --abc=true')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
    expect(errors).toEqual([{ type: 'expect-single', key: 'abc', keyType: z.boolean(), value: ['false', 'true'] }])
    // expect(getLogMessage(ctx.reporter)).toEqual(`received multiple '--abc' while expecting only one. Only the last value is used.`)
  })
  test('boolean options with multiple pass in single values gets array', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.array(z.boolean()), description: 'a' }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc=true')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: [true] })
  })
})
describe('numeric options', () => {
  test('number options with = syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc=123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with space syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc 123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with alias', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.number(), description: 'a', alias: ['a'] },
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli -a=123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with default', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.number(), default: 123, description: 'a' }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('singular options pass in multiple values gets the last value and emit warning', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    }
    const { command, args, errors } = testProcessArgv([defaultCommand], 'my-cli --abc=2 --abc=3')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 3 })
    expect(errors).toEqual([{ type: 'expect-single', key: 'abc', keyType: z.number(), value: ['2', '3'] }])
    // expect(getLogMessage(ctx.reporter)).toEqual(`received multiple '--abc' while expecting only one. Only the last value is used.`)
  })
})
describe('string options', () => {
  test('string options with = syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.string(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc=123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with space syntax', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: { abc: { type: z.string(), description: 'a' } },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli --abc 123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with alias', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.string(), description: 'a', alias: ['a'] },
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli -a=123')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with default', () => {
    const defaultCommand: command.Command = {
      name: '',
      options: {
        abc: { type: z.string(), default: '123', description: 'a' }
      },
      run() { }
    }
    const { command, args } = testProcessArgv([defaultCommand], 'my-cli')
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
})
