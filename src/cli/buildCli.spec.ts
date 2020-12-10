import a from 'assertron'
import { buildCli } from './buildCli'
import { mockAppContext } from './mockAppContext'

describe('configuration', () => {
  describe('not specified', () => {
    test('exit when no bin is in package.json', () => {
      const ctx = mockAppContext('no-bin/index.js')
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
    test('get name from package.json/bin', () => {
      const ctx = mockAppContext('single-bin/bin.js')
      const app = buildCli(ctx)()
      expect(app.name).toBe('single-cli')
    })
    test('get name from package.json/bin object', () => {
      const ctx = mockAppContext('multi-bin/bin-a.js')
      const app = buildCli(ctx)()
      expect(app.name).toBe('cli-a')
    })
    test('exit if call path is not listed in bin', () => {
      const ctx = mockAppContext('single-bin/other.js')
      buildCli(ctx)()
      console.info(ctx.reporter.logs)
      a.satisfies(ctx.reporter.logs, [{
        level: 400,
        args: [/Unable to locate/]
      }, {
        id: 'mock-ui',
        level: 400,
        args: ['exit with 1']
      }])
    })
    test.skip('get all config automatically', async () => {
      // const context = mockAppContext('single-bin/bin.js')
      // const cli = buildCli(context)
      // await cli()
      //   .default({
      //     description: '',
      //     arguments: [],
      //     options: {},
      //     interactive: true,
      //     handler() { }
      //   })
      //   .parse()
      //   .catch()
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
  })

})
