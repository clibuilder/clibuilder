import { Except, assertType, typeAssertion } from 'type-plus'
import { createCliArgv } from '../test-util'
import { Cli2, createCli } from './createCli'

describe('callable cli', () => {
  test('must specify name and version', () => {
    const cli = createCli({
      name: 'callable cli',
      version: '1.0.0',
      run() { }
    })
    expect(cli.name).toBe('callable cli')
    expect(cli.version).toBe('1.0.0')
  })

  test('run(_, argv) receives argv without "node"', () => {
    expect.assertions(1)

    const cli = createTestCli({
      run(_, argv) { expect(argv).toEqual(['cli']) }
    })

    cli.parse(['node', 'cli'])
  })

  test('args default with help', () => {
    expect.assertions(1)
    const cli = createTestCli({
      run(args) {
        assertType.isBoolean(args.help)
        expect(args.help).toBe(true)
      }
    })

    cli.parse(createCliArgv('cli', '--help'))
  })

  test('specify argument', () => {
    const cli = createTestCli({
      arguments: [{ name: 'arg1' }, { name: 'arg2' }],
      run(args) {
        assertType<string>(args.arg1)
        assertType<string>(args.arg2)
        expect(args.arg1).toEqual('value1')
        expect(args.arg2).toEqual('value2')
      }
    })

    cli.parse(createCliArgv('cli', 'value1', 'value2'))
  })

  test('specify options', () => {
    const cli = createTestCli({
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
        assertType<boolean>(args.option1)
        assertType<string>(args.option2)
        assertType<number>(args.option3)

        expect(args.option1).toBe(true)
      }
    })

    cli.parse(createCliArgv('cli', '--option1'))
  })
})

function createTestCli<
  Name extends string = string,
  Name1 extends string = string,
  Name2 extends string = string,
  Name3 extends string = string,
  >(options: Except<Cli2.ConstructOptions<Name, Name1, Name2, Name3>, 'name' | 'version'>) {
  return createCli({
    name: 'cli',
    version: '1.0.0',
    ...options,
  })
}
