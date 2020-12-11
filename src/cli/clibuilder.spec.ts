import a from 'assertron'
import { assertType, Equal, HasKey, T } from 'type-plus'
import { clibuilder } from './clibuilder'
import { mockAppContext } from './mockAppContext'

describe('fluent syntax', () => {
  test('order does not matter', () => {
    const cli = clibuilder(mockAppContext('string-bin/bin.js', 'has-json-config'))
    const order1 = cli.loadConfig({ type: T.any })
      .loadPlugins()
      .default({ run() { } })
      .addCommands([])
    type Actual1 = keyof typeof order1
    assertType.isTrue(true as Equal<
      'name' | 'version' | 'config' | 'description' |
      'loadPlugins' | 'addCommands' | 'parse', Actual1>)

    const order2 = cli.loadConfig({ type: T.any })
      .default({ run() { } })
      .addCommands([])
      .loadPlugins()
    type Actual2 = keyof typeof order2
    assertType.isTrue(true as Equal<
      'name' | 'version' | 'config' | 'description' |
      'loadPlugins' | 'addCommands' | 'parse', Actual2>)
  })
})

describe('options', () => {
  describe('not specified', () => {
    test('exit if call path is not listed in bin', () => {
      const ctx = mockAppContext('single-bin/other.js')
      clibuilder(ctx)
      a.satisfies(ctx.reporter.logs, [{
        level: 400,
        args: [/Unable to locate/]
      }, {
        id: 'mock-ui',
        level: 400,
        args: ['exit with 1']
      }])
    })
    test('no name in package.json receive folder as name', () => {
      const ctx = mockAppContext('no-nothing/index.js')
      const app = clibuilder(ctx)
      expect(app.name).toBe('no-nothing')
    })
    test('get name from package.json/bin string', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = clibuilder(ctx)
      expect(app.name).toBe('single-cli')
    })
    test('get name from package.json/bin object', () => {
      const ctx = mockAppContext('multi-bin/bin-a.js')
      const app = clibuilder(ctx)
      expect(app.name).toBe('cli-a')
    })
    test('get version', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = clibuilder(ctx)
      expect(app.version).toBe('1.2.3')
    })
    test('no version in package.json receive empty version string', () => {
      const ctx = mockAppContext('no-nothing/index.js')
      const app = clibuilder(ctx)
      expect(app.version).toBe('')
    })
    test('get description', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = clibuilder(ctx)
      expect(app.description).toBe('a single bin app')
    })
    test('no description in package.json receive empty description string', () => {
      const ctx = mockAppContext('no-nothing/index.js')
      const app = clibuilder(ctx)
      expect(app.description).toBe('')
    })
  })
})

describe('loadConfig', () => {
  test('load config from `{name}.json` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-rc-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc.json` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-rc-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified name', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ name: 'string-bin.json', type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `{name}.json`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `.{name}rc`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-rc-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `.${name}rc.json`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({ name: 'string-bin', type: T.object.create({ a: T.number.any }) })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('fail validation will emit warning and exit', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
    const cli = clibuilder(ctx)
    cli.loadConfig({
      type: T.object.create({ a: T.string.any })
    })

    a.satisfies(ctx.reporter.logs, [{
      id: 'mock-ui',
      level: 400,
      args: [`subject expects to be { a: string } but is actually { a: 1 }\nsubject.a expects to be string but is actually 1`]
    }, {
      id: 'mock-ui',
      level: 400,
      args: ['exit with 1']
    }])
  })
  test('after calling loadConfig, it is removed from builder', () => {
    const cli = clibuilder(mockAppContext('string-bin/bin.js', 'has-config'))
    const actual = cli.loadConfig({ type: T.any })
    assertType.isFalse(false as HasKey<typeof actual, 'loadConfig'>)
  })
  test('default() receives config type', async () => {
    const cli = clibuilder(mockAppContext('string-bin/bin.js', 'has-config'))
    cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
      .default({
        run() {
          assertType<{ a: number }>(this.config)
        }
      })
  })
  test('addCommands() receives config type', async () => {
    const cli = clibuilder(mockAppContext('string-bin/bin.js', 'has-config'))
    cli.loadConfig({ type: T.object.create({ a: T.number.any }) })
      .addCommands([{
        name: 'cmd-a',
        run() {
          assertType<{ a: number }>(this.config)
        }
      }, {
        name: 'cmd-b',
        run() {
          assertType<{ a: number }>(this.config)
        }
      }])
  })
})

test.skip('load plugin', async () => {
  // const context = createAppContext({ stack: mockStack('with-plugins/bin.js') })
  // const cli = buildCli(context)
  // await cli()
  //   .loadPlugins()
  //   .default({})
  //   .parse()
})
test.skip('command', async () => {
  // const context = createAppContext({ stack: mockStack('single-bin/bin.js') })
  // const cli = buildCli(context)
  // await cli().addCommand({
  //   name: '',
  //   description: '',
  //   arguments: [],
  //   options: {},
  //   interactive: true,
  //   handler() { }
  // }).parse()
})
