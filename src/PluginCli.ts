import { Cli, CliContext } from './Cli'
import { loadPlugins } from './loadPlugins'

export interface PluginCliOption {
  name: string
  version: string
  pluginKeyword?: string
}

export interface PluginCliContext extends CliContext {
}

export class PluginCli<Context extends CliContext & { [i: string]: any } = PluginCliContext> extends Cli {
  constructor(options: PluginCliOption, context: Partial<Context> = {} as any) {
    const { name, version } = options
    let { pluginKeyword = `${name}-plugin` } = options
    const cwd = context.cwd || process.cwd()
    const pluginConfigs = loadPlugins(pluginKeyword, { cwd })

    // PluginConfigs has the shape needed for CommandSpec
    super(name, version, pluginConfigs, context)
  }
}
