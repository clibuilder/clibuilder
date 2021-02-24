import a from 'assertron'
import * as z from 'zod'
import { cli } from './cli'
import { command, getBaseCommand } from './command'
import { lookupCommand } from './lookupCommand'
import { parseArgv } from './parseArgv'
import { argv } from './test-utils'

function testLookupCommand(commands: cli.Command[], args: string) {
  const r = lookupCommand(commands, parseArgv(argv(args)))
  return r ? { cmd: r.command, args: r.args, errors: r.errors } : r
}

// describe('with only base command', () => {
//   test('---x is invalid', () => {
//     const { errors } = testLookupCommand([], 'my-cli ---x')
//     expect(errors).toEqual([{ type: 'invalid-key', key: '-x' }])
//   })
//   test('--version gets undefined', () => {
//     const r = testLookupCommand([], 'my-cli --version')
//     expect(r).toBeUndefined()
//   })
//   test('-v gets undefined', () => {
//     const r = testLookupCommand([], 'my-cli -v')
//     expect(r).toBeUndefined()
//   })
//   test('--help', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli --help')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], help: true })
//   })
//   test('-h', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli -h')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], help: true })
//   })
//   test('--verbose', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli --verbose')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], verbose: true })
//   })
//   test('-V', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli -V')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], verbose: true })
//   })
//   test('--silent', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli --silent')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], silent: true })
//   })
//   test('--debug-cli', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli --debug-cli')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], 'debug-cli': true })
//   })
//   test('no arg receives base command with help options', () => {
//     const { cmd, args } = testLookupCommand([], 'my-cli')
//     expect(cmd).toBe(baseCommand)
//     expect(args).toEqual({ _: [], help: true })
//   })
// })
describe('with default command', () => {
  test('no args gets the default command', () => {
    const defaultCommand = { name: '', run() { } }
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
  })
  test('default command with --help gets default command', () => {
    const defaultCommand = command({
      name: '',
      options: {
        help: { type: z.boolean(), description: 'x' }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --help')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], help: true })
  })
  test('with one argument', () => {
    const defaultCommand = command({
      name: '',
      arguments: [{ name: 'arg', type: z.string(), description: 'some arg' }],
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli abc')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: ['abc'] })
  })
})
describe('argument', () => {
  test('argument can be optional', () => {
    const defaultCommand = command({
      name: '',
      arguments: [{ name: 'arg', type: z.string().optional(), description: 'some arg' }],
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
  })
  test('required argument', () => {
    const defaultCommand = command({
      name: '',
      arguments: [{ name: 'arg', type: z.string(), description: 'some required arg' }],
      run() { }
    })
    const { cmd, args, errors } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [] })
    expect(errors).toEqual([{ type: 'missing-argument', name: 'arg' }])
  })
})
describe('boolean options', () => {
  test('accepts true/false', () => {
    const { args } = testLookupCommand([getBaseCommand('') as any], 'my-cli -h false -v true')!
    expect(args).toEqual({ _: [], help: false, version: true })
  })
  test('other strings are invalid', () => {
    const { errors } = testLookupCommand([getBaseCommand('') as any], 'my-cli -h x')!
    a.satisfies(errors, [{ type: 'invalid-value', key: 'h', value: 'x' }])
  })
  test('boolean options with space syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { description: 'a', type: z.boolean() } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with = syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc=true')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with space syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc false')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean options with alias', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', alias: ['a'] }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli -a')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', default: true }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
  })
  test('boolean options with default as false', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.boolean(), description: 'a', default: false }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: false })
  })
  test('boolean array options', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.array(z.boolean()), description: 'a' }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc=true --abc=true')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: [true, true] })
  })
  test('boolean options pass in multiple values gets the last value and emit warning', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.boolean(), description: 'a' } },
      run() { }
    })
    const { cmd, args, errors } = testLookupCommand([defaultCommand], 'my-cli --abc=false --abc=true')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: true })
    a.satisfies(errors, [{ type: 'expect-single', key: 'abc', value: ['false', 'true'] }])
  })
  test('boolean options with multiple pass in single values gets array', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.array(z.boolean()), description: 'a' }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc=true')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: [true] })
  })
})
describe('numeric options', () => {
  test('number options with = syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc=123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with space syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc 123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with alias', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.number(), description: 'a', alias: ['a'] },
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli -a=123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('number options with default', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.number(), default: 123, description: 'a' }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 123 })
  })
  test('singular options pass in multiple values gets the last value and emit warning', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.number(), description: 'a' } },
      run() { }
    })
    const { cmd, args, errors } = testLookupCommand([defaultCommand], 'my-cli --abc=2 --abc=3')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: 3 })
    a.satisfies(errors, [{ type: 'expect-single', key: 'abc', value: ['2', '3'] }])
  })
})
describe('string options', () => {
  test('string options with = syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.string(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc=123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with space syntax', () => {
    const defaultCommand = command({
      name: '',
      options: { abc: { type: z.string(), description: 'a' } },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli --abc 123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with alias', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.string(), description: 'a', alias: ['a'] },
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli -a=123')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
  test('string options with default', () => {
    const defaultCommand = command({
      name: '',
      options: {
        abc: { type: z.string(), default: '123', description: 'a' }
      },
      run() { }
    })
    const { cmd, args } = testLookupCommand([defaultCommand], 'my-cli')!
    expect(cmd).toBe(defaultCommand)
    expect(args).toEqual({ _: [], abc: '123' })
  })
})
