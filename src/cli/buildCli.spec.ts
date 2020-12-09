import a from 'assertron'
import { getLogReporter, MemoryLogReporter } from 'standard-log'
import { buildCli } from './buildCli'
import { mockAppContext } from './mockAppContext'

describe('configuration', () => {
  describe('not specified', () => {
    test('exit no bin is in package.json', () => {
      const context = mockAppContext('no-bin/index.js')
      const reporter = getLogReporter('mock-reporter') as MemoryLogReporter
      buildCli(context)()
      a.satisfies(reporter.logs, [{
        id: 'mock-ui',
        level: 400,
        args: ['exit with 1']
      }])
    })
    test.todo('get name from package.json/bin')
    test.todo('get name from package.json/bin object')
    test.todo('throw if call path is not listed in bin')
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
