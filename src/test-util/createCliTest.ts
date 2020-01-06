import { JSONTypes, PartialPick } from 'type-plus'
import { Cli2, createCli } from '../cli'
import { createCliArgv } from './createCliArgv'
import { InMemoryPresenter } from './InMemoryPresenter'

export function createCliTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli2.BuildInContext> & Record<string | symbol, any>,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string
>(
  options: PartialPick<Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4>, 'name' | 'version'>,
  ...args: string[]
) {
  const ui = new InMemoryPresenter()
  const mergedOptions = {
    name: 'cli',
    version: '1.0.0',
    ...options,
    context: { ui, ...options.context } as Context & { ui: InMemoryPresenter },
  }
  return { cli: createCli(mergedOptions), argv: createCliArgv(mergedOptions.name, ...args), ui: mergedOptions.context!.ui } as const
}
