import { RecursivePartial } from 'type-plus';
import { Cli, CliContext } from '../cli';
import { CliCommand, createCliCommand } from '../cli-command';
import { createCommandArgs } from '../cli-command/createCommandArgs';
import { PresenterFactory, PresenterOption } from '../presenter';
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
    }
  )
}

export function setupCliCommandTest<
  Config extends Record<string, any> = Record<string, any>,
  Context extends Record<string, any> = CliContext>(
    command: CliCommand<Config, Context>,
    argv: string[],
    config?: Config,
    context: RecursivePartial<CliContext & Context> = {}) {
  const args = createCommandArgs(command, argv)

  const cmd = createCliCommand(
    command,
    {
      config,
      context
    }
  )

  overrideUI(cmd, new InMemoryPresenterFactory())

  return { cmd, args, argv, ui: cmd.ui as InMemoryPresenter }
}

function overrideUI(cmd: CliCommand, presenterFactory: PresenterFactory) {
  cmd.ui = presenterFactory.createCommandPresenter(cmd)
  if (cmd.commands) {
    cmd.commands.forEach(c => overrideUI(c, presenterFactory))
  }
}
