import { JSONTypes, PartialPick } from 'type-plus'
import { createPluginCli, PluginCli } from '../create-plugin-cli'
import { createCliArgv } from './createCliArgv'
import { InMemoryPresenter } from './InMemoryPresenter'
import { Cli } from '../create-cli/types'

export function createPluginCliTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  CConfig extends Config,
  CContext extends Context,
  O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
>(
  options: PartialPick<PluginCli.ConstructOptions<Config, Context, AName, BName, SName, NName, CConfig, CContext, O>, 'name' | 'version'>,
  ...args: string[]
) {
  const ui = new InMemoryPresenter()
  const mergedOptions: PluginCli.ConstructOptions<any, any, any, any, any, any, any, any> = {
    name: 'plugin-cli',
    version: '1.0.0',
    ...options,
    context: { ui, ...options.context } as Context & { ui: InMemoryPresenter },
  }
  return { cli: createPluginCli(mergedOptions), argv: createCliArgv(mergedOptions.name, ...args), ui: mergedOptions.context!.ui } as const
}
