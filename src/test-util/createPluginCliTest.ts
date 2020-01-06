import { JSONTypes, PartialPick } from 'type-plus'
import { createPluginCli, PluginCli2 } from '../plugin-cli'
import { createCliArgv } from './createCliArgv'
import { InMemoryPresenter } from './InMemoryPresenter'

export function createPluginCliTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string
>(
  options: PartialPick<PluginCli2.ConstructOptions<Config, Context, N1, N2, N3, N4>, 'name' | 'version'>,
  ...args: string[]
) {
  const ui = new InMemoryPresenter()
  const mergedOptions = {
    name: 'plugin-cli',
    version: '1.0.0',
    ...options,
    context: { ui, ...options.context } as Context & { ui: InMemoryPresenter },
  }
  return { cli: createPluginCli(mergedOptions), argv: createCliArgv(mergedOptions.name, ...args), ui: mergedOptions.context!.ui } as const
}
