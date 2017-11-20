import { Cli } from '../Cli';
import {
  CliCommand,
  // @ts-ignore
  CliCommandInstance
} from '../CliCommand';
import { createCliCommand } from '../createCliCommand'

import { InMemoryPresenter } from './InMemoryPresenter'
import { InMemoryPresenterFactory } from './InMemoryPresenterFactory';
import { createCommandArgs } from './createCommandArgs';

export function createInMemoryCli(name: string, ...commands): Cli {
  return new Cli(
    { name, version: '1.0.0', commands },
    {
      presenterFactory: {
        createCliPresenter(options) { return new InMemoryPresenter(options) },
        createCommandPresenter(options) { return new InMemoryPresenter(options) }
      }
    })
}

export function setupCliCommandTest<Config, Context = {}>(command: CliCommand<Config, Context>, argv: string[], context: { config?: Config } & Context = {} as any) {
  const presenterFactory = new InMemoryPresenterFactory()
  const args = createCommandArgs(command, argv)
  const cmd = createCliCommand(command, presenterFactory, context)

  return { cmd, args, argv, ui: cmd.ui as InMemoryPresenter }
}
