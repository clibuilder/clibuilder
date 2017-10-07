import { InMemoryPresenter } from './InMemoryPresenter'

import { TaskConstructor, Task, ViewBuilder, createTaskRunner } from '../Task'
import { Cli } from '../Cli';

export function setupTaskTest<J extends Task>(Task: TaskConstructor<J>, emitterBuilder: ViewBuilder = () => { return }) {
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

export function createInMemoryCli(name: string, ...commandSpecs): Cli<any> {
  return new Cli(
    { name, version: '1.0.0' },
    commandSpecs, {
      presenterFactory: {
        createCliPresenter(options) { return new InMemoryPresenter(options) },
        createCommandPresenter(options) { return new InMemoryPresenter(options) }
      }
    })
}
