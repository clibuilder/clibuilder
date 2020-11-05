import { AppContext, createAppContext } from './createAppContext'
import { mockStack } from './mockAppContext'

describe('configuration', () => {
  describe('name', () => {
    describe('not specified', () => {
      test.skip('throw if no bin is in package.json', () => {
        const context = createAppContext({ stack: mockStack('no-bin/index.js') })
        expect(() => buildCli(context, {})).toThrowError()
      })
      test.todo('throw if there are more than one bin')
      test.todo('get name from package.json/bin')
      test.todo('get name from package.json/bin object')
    })
  })
})
test('cli get name from package.json if not specified', () => {
  // cli.name('abc')
  // .version('1.2.3')
  // .argument('')
  // .option()
  // .config()
  // .context()
  // .command('sdf')
  // .command('fsdf')

  // cli.new({

  // })
})

export function cli(config: cli.Config) {
  const context = createAppContext()
  return buildCli(context, config)
}

export namespace cli {
  export type Config = {
    name?: string
  }
}

function buildCli(context: AppContext, config: cli.Config) {
  const name = getCliName(context, config)
}

function getCliName(context: AppContext, config: Pick<cli.Config, 'name'>) {
  if (config.name) return config.name
  const appinfo = context.loadAppInfo()
}
