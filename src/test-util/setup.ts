import { Cli } from '../Cli';
import {
CliCommand,
  // @ts-ignore
  CliCommandInstance
} from '../CliCommand';
import { PresenterFactory } from '../interfaces';
import { createCommandArgs } from './createCommandArgs';
import { InMemoryPresenter } from './InMemoryPresenter';
import { InMemoryPresenterFactory } from './InMemoryPresenterFactory';

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

function createCliCommand<Config, Context = {}>(spec: CliCommand<Config, Context>, presenterFactory: PresenterFactory, context: {
  config?: Config,
  [index: string]: any
}): CliCommandInstance<Config, Context> {
  const result = {
    ...context,
    ...spec
  } as CliCommandInstance<Config, Context>
  result.ui = presenterFactory.createCommandPresenter(result)
  if (result.commands) {
    result.commands = result.commands.map(c => createCliCommand(c, presenterFactory, { ...context, parent: result }))
  }

  return result
}
