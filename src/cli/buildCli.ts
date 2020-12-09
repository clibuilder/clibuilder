import { AppContext } from './createAppContext'
import { cli } from './types'

export function buildCli(context: AppContext) {
  return function clibuilder(options?: cli.Options) {
    const state = createAppState(context, options)
    context.process.exit(1)
    return {
      loadConfig(typeDef: any): Omit<cli.Builder, 'loadConfig'> { return {} as any },
      loadPlugins(): Omit<cli.Builder, 'loadPlugin'> { return {} as any },
      default(command: any): cli.Executable { return {} as any },
      addCommand(command: any): cli.Executable { return {} as any },
      parse(argv?: string[]): Promise<void> { return {} as any }
    }
  }
}

function createAppState(context: AppContext, options?: cli.Options) {
  if (options) return options
  return context.loadAppInfo(new Error().stack!)
}
