import { JSONTypes, hasProperty } from 'type-plus'
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
  const commands = options.commands ?? []
  commands.unshift(pluginsCommand)
  const cwd = options.context?.cwd ?? process.cwd()

  const keyword = options.keyword || `${options.name}-plugin`
  const loadingPlugins = loadPlugins(keyword, { cwd })
    .then(cmds => commands!.push(...cmds))
  let cli: Cli
  return {
    name: options.name,
    version: options.version,
    parse(argv) {
      return loadingPlugins.then(() => {
        if (!cli) {
          const configName = options.configName ?? (options.config || hasConfig(commands) ? options.name : undefined)
          cli = createCli({
            ...options,
            configName,
            commands,
            context: {
              ...options.context,
              keyword
            }
          } as any)
        }
        return cli.parse(argv)
      })
    }
  }
}

function hasConfig(commands: PluginCli.Command[]): boolean {
  return commands.some(c => {
    if (hasProperty(c, 'config')) return true
    if (c.commands) return hasConfig(c.commands)
    return false
  })
}
