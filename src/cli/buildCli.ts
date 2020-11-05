import { AppContext } from './createAppContext'
import { cli } from './types'

export function buildCli(context: AppContext) {
  return function clibuilder(config: cli.Config = {}) {
    const name = getCliName(context, config)
    return {
      loadConfig(typeDef: any): Omit<cli.Builder, 'loadConfig'> { return {} as any },
      loadPlugins(): Omit<cli.Builder, 'loadPlugin'> { return {} as any },
      default(command: any): cli.Executable { return {} as any },
      addCommand(command: any): cli.Executable { return {} as any }
    }
  }
}

function getCliName(context: AppContext, config: Pick<cli.Config, 'name'>) {
  if (config.name) return config.name
  const appinfo = context.loadAppInfo()
}
