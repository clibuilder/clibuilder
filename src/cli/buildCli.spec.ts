import a from 'assertron'
import { buildCli } from './buildCli'
import { mockAppContext } from './mockAppContext'

describe('configuration', () => {
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
