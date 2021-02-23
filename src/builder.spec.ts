// import { assertType, CanAssign, Equal, HasKey, T } from 'type-plus'
// import { createCliArgv } from '../test-util'
import a from 'assertron'
import { argv, getFixturePath, getLogMessage } from './test-utils'
import { cli } from './cli'
import { builder } from './builder'
import { mockContext } from './mockContext'

describe('with options', () => {
  test('need to specify name, version, and description', () => {
    const cli = builder(mockContext('no-bin/other.js'), {
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
    a.satisfies(cli, {
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
  })
})

describe('without options', () => {
  test('no bin in package.json receive folder as name', () => {
    const ctx = mockContext('no-bin/index.js')
    const app = builder(ctx)
    expect(app.name).toBe('no-bin')
  })
  test('get name from package.json/bin string', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.name).toBe('single-cli')
  })
  test('get name from package.json/bin object', () => {
    const ctx = mockContext('multi-bin/bin-a.js')
    const app = builder(ctx)
    expect(app.name).toBe('cli-a')
  })
  test('no version in package.json receive empty version string', () => {
    const ctx = mockContext('no-nothing/index.js')
    const app = builder(ctx)
    expect(app.version).toBe('')
  })
  test('get version', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.version).toBe('1.2.3')
  })
  test('get description', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.description).toBe('a single bin app')
  })
  test('no description in package.json receive empty description string', () => {
    const ctx = mockContext('no-nothing/index.js')
    const app = builder(ctx)
    expect(app.description).toBe('')
  })
  test('exit if call path is not listed in bin', () => {
    const ctx = mockContext('single-bin/other.js')
    builder(ctx)
    a.satisfies(ctx.reporter.logs, [{
      level: 400,
      args: [/Unable to locate/]
    }, {
      id: 'mock-ui',
      level: 400,
      args: ['exit with 1']
    }])
  })
})

describe('default()', () => {
  test('adds default command for cli to run', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { return 'hello' } })
    expect(await cli.parse(argv('single-bin'))).toEqual('hello')
  })
})

describe('version', () => {
  test('-v shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin -v'))
    expect(getLogMessage(ctx.reporter)).toEqual('1.0.0')
  })
  test('--version shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin --version'))
    expect(getLogMessage(ctx.reporter)).toEqual('1.0.0')
  })
})

describe('help', () => {
  test('-h shows help', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin -h'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('--help shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin --help'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('help with cli.description', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('single-bin -h'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('show help if no command matches', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('single-bin not-exist'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test.todo('show help if missing argument')
})

describe('--silent', () => {
  test('--silent disables ui', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.info('should not print')
        this.ui.warn('should not print')
        this.ui.error('should not print')
      }
    })
    await cli.parse(argv('single-bin --silent'))
    expect(getLogMessage(ctx.reporter)).toEqual('')
  })
  test.todo('command.run() will not get args.silent')
})

describe('--verbose', () => {
  test('--verbose enables debug messages', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.debug('should print')
      }
    })
    await cli.parse(argv('single-bin --verbose'))
    expect(getLogMessage(ctx.reporter)).toEqual('should print')
  })
  test('-V enables debug messages', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.debug('should print')
      }
    })
    await cli.parse(argv('single-bin -V'))
    expect(getLogMessage(ctx.reporter)).toEqual('should print')
  })
  test.todo('command.run() will not get args.silent')
})

describe('--debug-cli', () => {
  test('turns on cli-level debug messages', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const app = builder(ctx).default({ run() { } })
    await app.parse(argv('string-bin --debug-cli'))
    const startPath = getFixturePath('string-bin/bin.js')
    const pjsonPath = getFixturePath('string-bin/package.json')
    const msg = getLogMessage(ctx.reporter)
    a.true(msg.startsWith(`finding package.json starting from '${startPath}'...
found package.json at '${pjsonPath}'
package name: string-bin
version: 1.0.0
description: undefined
argv: node string-bin --debug-cli`))
  })
  test.todo('log commands added')
  test.todo('log loading plugins')
})

// describe('fluent syntax', () => {
//   test('order does not matter', () => {
//     const cli = builder(mockAppContext('string-bin/bin.js', 'has-json-config'))
//     const order1 = cli.loadConfig({ type: T.any })
//       .loadPlugins()
//       .default({ run() { } })
//       .addCommands([])
//     type Actual1 = keyof typeof order1
//     assertType.isTrue(true as Equal<
//       'name' | 'version' | 'config' | 'description' |
//       'addCommands' | 'parse', Actual1>)

//     const order2 = cli.loadConfig({ type: T.any })
//       .default({ run() { } })
//       .addCommands([])
//       .loadPlugins()
//     type Actual2 = keyof typeof order2
//     assertType.isTrue(true as Equal<
//       'name' | 'version' | 'config' | 'description' |
//       'addCommands' | 'parse', Actual2>)
//   })
//   test('no parse without default, addCommands, or loadPlugin', () => {
//     const cli = builder(mockAppContext('string-bin/bin.js', 'has-json-config'))
//     type K1 = keyof typeof cli
//     assertType.isFalse(false as CanAssign<'parse', K1>)
//   })
// })

// describe('loadConfig()', () => {
//   test('load config from `{name}.json` at cwd', () => {
//     const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config from `.{name}rc` at cwd', () => {
//     const ctx = mockAppContext('string-bin/bin.js', 'has-rc-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config from `.{name}rc.json` at cwd', () => {
//     const ctx = mockAppContext('string-bin/bin.js', 'has-rc-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config with specified name', () => {
//     const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ name: 'string-bin.json', type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config with specified `{name}.json`', () => {
//     const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config with specified `.{name}rc`', () => {
//     const ctx = mockAppContext('single-bin/bin.js', 'has-rc-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('load config with specified `.${name}rc.json`', () => {
//     const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
//   test('fail validation will emit warning and exit', () => {
//     const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({
//       type: T.object.create({ a: T.string.any })
//     })

//     a.satisfies(ctx.reporter.logs, [{
//       id: 'mock-ui',
//       level: 400,
//       args: [`subject expects to be { a: string } but is actually { a: 1 }\nsubject.a expects to be string but is actually 1`]
//     }, {
//       id: 'mock-ui',
//       level: 400,
//       args: ['exit with 1']
//     }])
//   })
//   test('after calling loadConfig, it is removed from builder', () => {
//     const cli = builder(mockAppContext('string-bin/bin.js', 'has-config'))
//     const actual = cli.loadConfig({ type: T.any })
//     assertType.isFalse(false as HasKey<typeof actual, 'loadConfig'>)
//   })
//   test('default() receives config type', async () => {
//     const cli = builder(mockAppContext('string-bin/bin.js', 'has-config'))
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//       .default({
//         run() {
//           assertType<{ a: number }>(this.config)
//         }
//       })
//   })
//   test('addCommands() receives config type', async () => {
//     const cli = builder(mockAppContext('string-bin/bin.js', 'has-config'))
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//       .addCommands([{
//         name: 'cmd-a',
//         run() {
//           assertType<{ a: number }>(this.config)
//         }
//       }, {
//         name: 'cmd-b',
//         run() {
//           assertType<{ a: number }>(this.config)
//         }
//       }])
//   })
//   test('can observe config from cli.config', () => {
//     const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
//     const cli = builder(ctx)
//     cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
//     expect(cli.config).toEqual({ a: 1 })
//   })
// })

// describe('addCommands()', () => {
//   test.skip('add default command options to help', async () => {
//     const ctx = mockAppContext('string-bin/bin.js')
//     const cli = builder(ctx)
//     const actual = cli.default({
//       description: '',
//       options: { number: { a: { description: 'a number ' } } },
//       run(args) {
//         return args.a
//       }
//     }).parse(argv('-a 123'))
//     expect(actual).toBe(123)
//   })
//   test('use default command description in help', async () => {
//     const ctx = mockAppContext('string-bin/bin.js')
//     const cli = builder(ctx)
//     cli.default({
//       description: 'is used',
//       run() { }
//     }).parse(argv('--help'))
//     expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage({ ...cli, description: 'is used' }))
//   })
//   // test('add default command options to help', async () => {
//   //   const ctx = mockAppContext('string-bin/bin.js')
//   //   const cli = builder(ctx)
//   //   cli.default({
//   //     options: { number: { a: { description: 'a number ' } } },
//   //     run() { }
//   //   }).parse(argv('--help'))
//   //   expect(getLogMessage(ctx.reporter)).toEqual('')
//   // })
// })

// describe('addCommands()', () => {
//   test.skip('command', async () => {
//     // const context = createAppContext({ stack: mockStack('single-bin/bin.js') })
//     // const cli = buildCli(context)
//     // await cli().addCommand({
//     //   name: '',
//     //   description: '',
//     //   arguments: [],
//     //   options: {},
//     //   interactive: true,
//     //   handler() { }
//     // }).parse()
//   })
// })

// describe('loadPlugin()', () => {
//   test.skip('use "{name}-plugin" as keyword to look for plugins', async () => {
//     const ctx = mockAppContext('one-plugin/bin.js')
//     const actual = await builder(ctx)
//       .loadPlugins()
//       .parse(createCliArgv('one-plugin', 'one', 'echo', 'bird'))
//     expect(actual).toEqual('bird')
//   })
// })

function getHelpMessage(app: Pick<cli.Builder<any>, 'name' | 'description'>) {
  return `
Usage: ${app.name} [options]
${app.description ? `
  ${app.description}
`: ''}
Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}
