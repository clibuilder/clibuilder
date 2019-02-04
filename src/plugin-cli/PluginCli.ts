import { RecursivePartial } from 'type-plus';
import { Cli, CliContext } from '../Cli';
import { CliCommand } from '../cli-command';
import { loadPlugins } from './loadPlugins';

export interface PluginCliOption<Config> {
  name: string
  version: string
  commands?: CliCommand<Config, any>[]
  keyword?: string
}

export interface PluginCliContext extends CliContext {
}

export class PluginCli<
  Config extends Record<string, any> = any,
  Context extends Record<string, any> = CliContext> extends Cli<Config, Context> {
  protected loadingPlugins: Promise<void>
  public keyword: string
  constructor(options: PluginCliOption<Config>, context?: RecursivePartial<PluginCliContext & Context>) {
    let { name, version, commands = [], keyword = `${options.name}-plugin` } = options

    super({ name, version, commands }, context)

    const cwd = this.context.cwd
    this.keyword = keyword
    this.loadingPlugins = loadPlugins(keyword, { cwd }).then(commands => {
      commands.forEach(command => this.addCliCommand(command))
    })
  }

  parse(rawArgv: string[]) {
    return this.loadingPlugins.then(() => super.parse(rawArgv))
  }
}
