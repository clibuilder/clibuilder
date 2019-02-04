import { Cli, CliContext } from '../Cli';
import { CliCommand } from '../CliCommand';
import { createCliCommand } from '../CliCommand/createCliCommand';
import { createCommandArgs } from '../CliCommand/createCommandArgs';
import { PresenterOption } from '../Presenter';
import { InMemoryPresenter } from './InMemoryPresenter';
import { InMemoryPresenterFactory } from './InMemoryPresenterFactory';

export function createInMemoryCli(name: string, ...commands: CliCommand[]) {
  return new Cli(
    { name, version: '1.0.0', commands },
    {
      presenterFactory: {
        createCliPresenter(options: PresenterOption) { return new InMemoryPresenter(options) },
        createCommandPresenter(options: PresenterOption) { return new InMemoryPresenter(options) }
      }
    })
}

export function setupCliCommandTest<
  Config extends Record<string, any> = Record<string, any>,
  Context extends Record<string, any> = CliContext>(
    command: CliCommand<Config, Context>,
    argv: string[],
    config: Config | undefined = undefined,
    context: Context = {} as any) {
  const args = createCommandArgs(command, argv)
  const cmd = createCliCommand(
    command,
    {
      config,
      context
    })

  cmd.ui = new InMemoryPresenterFactory().createCommandPresenter(cmd)
  return { cmd, args, argv, ui: cmd.ui as InMemoryPresenter }
}

// export function setupCliCommandTest<Config, Context = {}>(command: CliCommand<Config, Context>, argv: string[], context: { config?: Config } & Context = {} as any) {
//   const presenterFactory = new InMemoryPresenterFactory()
//   const args = createCommandArgs(command, argv)
//   const cmd = createCliCommand(command, { context: { presenterFactory, ...context } })

//   return { cmd, args, argv, ui: cmd.ui as InMemoryPresenter }
// }
