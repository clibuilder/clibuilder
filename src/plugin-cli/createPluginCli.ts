import { JSONTypes } from 'type-plus'
import { Cli, createCli } from '../cli'
import { pluginsCommand } from '../commands'
import { loadPlugins } from './loadPlugins'
import { PluginCli } from './types'

export function createPluginCli<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any>,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string,
  >(options: PluginCli.ConstructOptions<Config, Context, N1, N2, N3, N4>): Cli {
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
