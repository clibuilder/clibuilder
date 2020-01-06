import { JSONTypes } from 'type-plus'
import { Cli, createCli } from '../cli'
import { loadPlugins } from './loadPlugins'
import { pluginsCommand } from './pluginsCommand'
import { PluginCli } from './types'

export function createPluginCli<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any>,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  >(options: PluginCli.ConstructOptions<Config, Context, AName, BName, SName, NName>): Cli {
  options.commands = options.commands ?? []
  options.commands.unshift(pluginsCommand as any)
  const cwd = options.context?.cwd ?? process.cwd()

  const keyword = options.keyword || `${options.name}-plugin`
  options.context = { ...options.context, keyword } as any
  const loadingPlugins = loadPlugins(keyword, { cwd }).then(commands => {
    return options.commands!.push(...commands as any)
  })
  let cli: Cli
  return {
    name: options.name,
    version: options.version,
    parse(argv) {
      return loadingPlugins.then(() => {
        if (!cli) cli = createCli(options as any)
        return cli.parse(argv)
      })
    }
  }
}
