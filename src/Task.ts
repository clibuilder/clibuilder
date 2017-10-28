import { Emitter } from 'fsa-emitter'
import _ = require('lodash')

import { LogPresenter, HelpPresenter } from './Presenter'

export interface ViewContext {
  ui: LogPresenter & HelpPresenter
}

export type ViewBuilder<Context extends ViewContext = ViewContext> = (emitter: Emitter, context: Context) => void
export interface TaskContext {
  emitter: Emitter
}

export type TaskConstructor<T extends Task = Task> = new (context: TaskContext) => T

/**
 * Task to run pure logic.
 * Communication to UI is done through emitter.
 */
export abstract class Task {
  protected emitter: Emitter
  constructor(context: TaskContext) {
    _.defaults(this, context)
  }

  /**
   * Overrides this method with the calling signature of your task.
   * @param args some arguments
   */
  abstract run(...args: any[]): void | Promise<any>
}

export function createTaskRunner<T extends Task, VC extends ViewContext = ViewContext>(context: VC, Task: TaskConstructor<T>, emitterBuilder: ViewBuilder<VC> = () => { return }) {
  const emitter = new Emitter()
  emitterBuilder(emitter, context)

  return {
    run(...args: any[]) {
      try {
        const task = new Task({ emitter })
        return task.run(...args)
      }
      catch (e) {
        context.ui.error(e)
      }
    }
  } as T
}
