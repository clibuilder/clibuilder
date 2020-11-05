import { O } from 'type-plus'
import { buildCli } from './buildCli'
import { createAppContext } from './createAppContext'
import { mockAppContext, mockStack } from './mockAppContext'

describe('configuration', () => {
  describe('name', () => {
    describe('not specified', () => {
      test.skip('throw if no bin is in package.json', () => {
        const context = createAppContext({ stack: mockStack('no-bin/index.js') })
        expect(() => buildCli(context)({})).toThrowError()
      })
      test.todo('get name from package.json/bin')
      test.todo('get name from package.json/bin object')
      test.todo('throw if call path is not listed in bin')
    })
  })
})

describe('spec', () => {
  test.skip('get all config automatically', async () => {
    const context = mockAppContext('single-bin/bin.js')
    const cli = buildCli(context)
    await cli()
      .default({
        description: '',
        arguments: [],
        options: {},
        interactive: true,
        handler() { }
      })
      .parse()
      .catch()
  })
  test.skip('load config', async () => {
    const context = createAppContext({ stack: mockStack('with-config/bin.js') })
    const cli = buildCli(context)
    await cli()
      .loadConfig(O.object.create({
        'foo': O.boolean
      }))
      .default({
        description: '',
        handler() {
          expect(this.config.foo).toBe(false)
        }
      })
      .parse()
  })
  test.skip('load plugin', async () => {
    const context = createAppContext({ stack: mockStack('with-plugins/bin.js') })
    const cli = buildCli(context)
    await cli()
      .loadPlugins()
      .default({})
      .parse()
  })
  test.skip('command', async () => {
    const context = createAppContext({ stack: mockStack('single-bin/bin.js') })
    const cli = buildCli(context)
    await cli().addCommand({
      name: '',
      description: '',
      arguments: [],
      options: {},
      interactive: true,
      handler() { }
    }).parse()
  })
})
