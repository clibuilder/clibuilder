import a from 'assertron'
import { assertType, HasKey } from 'type-plus'
import { buildCli } from './buildCli'
import { mockAppContext } from './mockAppContext'
import { getFixturePath } from '../test-utils'
import path from 'path'

describe('options', () => {
  describe('not specified', () => {
    test('exit if call path is not listed in bin', () => {
      const ctx = mockAppContext('single-bin/other.js')
      buildCli(ctx)()
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
      const app = buildCli(ctx)()
      expect(app.name).toBe('no-nothing')
    })
    test('get name from package.json/bin string', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = buildCli(ctx)()
      expect(app.name).toBe('single-cli')
    })
    test('get name from package.json/bin object', () => {
      const ctx = mockAppContext('multi-bin/bin-a.js')
      const app = buildCli(ctx)()
      expect(app.name).toBe('cli-a')
    })
    test('get version', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = buildCli(ctx)()
      expect(app.version).toBe('1.2.3')
    })
    test('no version in package.json receive empty version string', () => {
      const ctx = mockAppContext('no-nothing/index.js')
      const app = buildCli(ctx)()
      expect(app.version).toBe('')
    })
    test('get description', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = buildCli(ctx)()
      expect(app.description).toBe('a single bin app')
    })
    test('no description in package.json receive empty description string', () => {
      const ctx = mockAppContext('no-nothing/index.js')
      const app = buildCli(ctx)()
      expect(app.description).toBe('')
    })
  })
})

describe('loadConfig', () => {
  test('load config from `{name}.json` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig()
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-rc-config')
    const cli = buildCli(ctx)()
    cli.loadConfig()
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc.json` at cwd', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-rc-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig()
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified name', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig({ name: 'string-bin.json' })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `{name}.json`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig({ name: 'string-bin' })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `.{name}rc`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-rc-config')
    const cli = buildCli(ctx)()
    cli.loadConfig({ name: 'string-bin' })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('load config with specified `.${name}rc.json`', () => {
    const ctx = mockAppContext('single-bin/bin.js', 'has-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig({ name: 'string-bin' })
    expect(ctx.config).toEqual({ a: 1 })
  })
  test('handler receives ui, filepath, and config', () => {
    const ctx = mockAppContext('string-bin/bin.js', 'has-json-config')
    const cli = buildCli(ctx)()
    cli.loadConfig({
      handler({ ui, filepath, config }) {
        expect(ui).toEqual(ctx.ui)
        expect(filepath).toBe(getFixturePath(path.join(`has-json-config`, 'string-bin.json')))
        expect(config).toEqual({ a: 1 })
      }
    })
  })
  test('after calling loadConfig, it is removed from builder', () => {
    const cli = buildCli(mockAppContext('string-bin/bin.js', 'has-config'))()
    const actual = cli.loadConfig()
    assertType.isFalse(false as HasKey<typeof actual, 'loadConfig'>)
  })
})

test.skip('load config', async () => {
  // const context = createAppContext({ stack: mockStack('with-config/bin.js') })
  // const cli = buildCli(context)
  // await cli()
  //   .loadConfig(O.object.create({
  //     'foo': O.boolean
  //   }))
  //   .default({
  //     description: '',
  //     handler() {
  //       expect(this.config.foo).toBe(false)
  //     }
  //   })
  //   .parse()
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
