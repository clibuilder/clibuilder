import { Cli, CliContext } from './Cli'
import { loadPlugins } from './loadPlugins'

export interface PluginCliOption {
  name: string
  version: string
  keyword?: string
}

export interface PluginCliContext extends CliContext {
}

export class PluginCli<Context extends CliContext & { [i: string]: any } = PluginCliContext> extends Cli {
  constructor(options: PluginCliOption, context: Partial<Context> = {} as any) {
    let { name, version, keyword = `${options.name}-plugin` } = options
    const cwd = context.cwd || process.cwd()

    const commands = loadPlugins(keyword, { cwd })
    super({ name, version, commands }, context)
  }
}
