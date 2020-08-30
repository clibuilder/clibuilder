import { JSONTypes, PartialPick } from 'type-plus'
import { Cli, createCli } from '../create-cli'
import { createCliArgv } from './createCliArgv'
import { InMemoryPresenter } from './InMemoryPresenter'

export function createCliTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any>,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string
>(
  options: PartialPick<
    Cli.ConstructOptions<Config, Context, AName, BName, SName, NName>,
    'name' | 'version' | 'description'>,
  ...args: string[]
) {
  const ui = new InMemoryPresenter()
  const mergedOptions = {
    name: 'cli',
    version: '1.0.0',
    description: '',
    ...options,
    context: { ui, ...options.context } as Context & { ui: InMemoryPresenter },
  }
  return { cli: createCli(mergedOptions), argv: createCliArgv(mergedOptions.name, ...args), ui: mergedOptions.context!.ui } as const
}
