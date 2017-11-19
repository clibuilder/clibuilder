import { Cli } from '../Cli';
import {
  CliCommand,
  // @ts-ignore
  CliCommandInstance
} from '../CliCommand';
import { TaskConstructor, Task, ViewBuilder, createTaskRunner } from '../Task'
import { createCommand } from '../util'

import { InMemoryPresenter } from './InMemoryPresenter'
import { InMemoryPresenterFactory } from './InMemoryPresenterFactory';
import { createCommandArgs } from './createCommandArgs';


export function setupTaskTest<T extends Task>(Task: TaskConstructor<T>, emitterBuilder: ViewBuilder = () => { return }) {
  const { ui } = createViewContext(Task.name)
  const runner = createTaskRunner({ ui }, Task, emitterBuilder)
  return {
    runner,
    ui
  }
}

export function createViewContext(name) {
  return {
    ui: new InMemoryPresenter({ name })
  }
}

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

export function setupCommandTest<Config, Context = {}>(command: CliCommand<Config, Context>, argv: string[], context: { config?: Config } & Context = {} as any) {
  const presenterFactory = new InMemoryPresenterFactory()
  const args = createCommandArgs(command, argv)
  const cmd = createCommand(command, presenterFactory, context)

  return { cmd, args, argv, ui: cmd.ui as InMemoryPresenter }
}
