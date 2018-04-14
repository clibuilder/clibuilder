import { Cli, CliContext } from './Cli'
import { CliCommand } from './CliCommand'
import { loadPlugins } from './loadPlugins'

export interface PluginCliOption {
  name: string
  version: string
  commands?: CliCommand[]
  keyword?: string
}

export interface PluginCliContext extends CliContext {
}

export class PluginCli<Context extends { [i: string]: any } = {}> extends Cli {
  protected loadingPlugins: Promise<void>

  constructor(options: PluginCliOption, context: Partial<PluginCliContext> & Context = {} as any) {
    let { name, version, commands = [], keyword = `${options.name}-plugin` } = options

    // istanbul ignore next
    const cwd = context.cwd || process.cwd()

    super({ name, version, commands }, context)
    this.loadingPlugins = loadPlugins(keyword, { cwd }).then(commands => {
      commands.forEach(command => this.addCliCommand(command))
    })
  }

  parse(rawArgv: string[]) {
    return this.loadingPlugins.then(() => super.parse(rawArgv))
  }
}
