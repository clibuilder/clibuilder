import { JSONTypes } from 'type-plus'
import { Cli2, createCli } from '../cli'
import { pluginsCommand } from '../commands'
import { loadPlugins } from './loadPlugins'
import { PluginCli2 } from './types'

export function createPluginCli<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli2.BuildInContext> & Record<string | symbol, any>,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string,
  >(options: PluginCli2.ConstructOptions<Config, Context, N1, N2, N3, N4>): Cli2 {
  options.commands = options.commands ?? []
  options.commands.unshift(pluginsCommand as any)
  const cwd = options.context?.cwd ?? process.cwd()

  const keyword = options.keyword || `${options.name}-plugin`
  options.context = { ...options.context, keyword } as any
  const loadingPlugins = loadPlugins(keyword, { cwd }).then(commands => {
    return options.commands!.push(...commands as any)
  })
  let cli: Cli2
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
