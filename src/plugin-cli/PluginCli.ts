import { CliArgs } from '../argv-parser/types'
import { Cli } from '../cli'
import { CliCommand } from '../cli-command'
import { pluginsCommand } from '../commands'
import { loadPlugins } from './loadPlugins'

export type PluginCliOptions<Config, Context> = ({
  name: string,
  version: string,
  keyword?: string,
  defaultConfig?: Config,
} | {
  name: string,
  version: string,
  keyword?: string,
  defaultConfig?: Config,
  context: Context,
}) & ({
  commands?: CliCommand<any, Context>[],
} | {
  arguments?: CliCommand.Argument[],
  options?: CliCommand.Options,
  alias?: string[],
  commands?: CliCommand<any, Context>[],
  run(args: CliArgs, argv: string[]): void | Promise<any>,
})


export class PluginCli<
  Config extends Record<string, any> = Record<string, any>,
  Context extends Record<string, any> = Record<string, any>
  > extends Cli<Config, Context> {
  protected loadingPlugins: Promise<void>
  public keyword: string
  constructor(
    options: PluginCliOptions<Config, Context>,
  ) {
    super({ commands: [pluginsCommand], ...options })

    const cwd = this.context.cwd
    this.keyword = options.keyword || `${options.name}-plugin`
    this.loadingPlugins = loadPlugins(this.keyword, { cwd }).then(commands => {
      commands.forEach(command => this.addCliCommand(command))
    })
  }

  parse(rawArgv: string[]) {
    return this.loadingPlugins.then(() => super.parse(rawArgv))
  }
}
