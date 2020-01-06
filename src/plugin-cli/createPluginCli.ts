import { JSONTypes } from 'type-plus';
import { Cli2 } from '../cli/types';
import { PluginCli2 } from './types';
import { pluginsCommand } from '../commands';
import { loadPlugins } from './loadPlugins';
import { createCli } from '../cli';

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
  const loadingPlugins = loadPlugins(keyword, { cwd }).then(commands => options.commands!.push(...commands as any))

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
