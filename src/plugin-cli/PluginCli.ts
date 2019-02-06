import { Except, RecursivePartial } from 'type-plus';
import { Cli, CliContext, CliOption } from '../cli';
import { CliCommand } from '../cli-command';
import { loadPlugins } from './loadPlugins';

export type PluginCliOption<Config, Context> = Except<CliOption<Config, Context>, 'commands'> & {
  commands?: CliCommand<Config, any>[]
  keyword?: string
}

export class PluginCli<
  Config extends Record<string, any> = Record<string, any>,
  Context extends Record<string, any> = Record<string, any>
  > extends Cli<Config, Context> {
  protected loadingPlugins: Promise<void>
  public keyword: string
  constructor(
    options: PluginCliOption<Config, Context>,
    context?: RecursivePartial<CliContext> & Context
  ) {
    super({ commands: [], ...options }, context)

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
