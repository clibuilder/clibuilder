import { Emitter, createActionCreator } from 'fsa-emitter'

import { Registrar, Command, createTaskRunner, Task, ViewContext } from '../index'

const message = createActionCreator<string>('dummy')

class DummyTask extends Task {
  run() {
    this.emitter.emit(message('dummy', undefined))
  }
}

function dummyViewBuilder(emitter: Emitter, { ui }: ViewContext) {
  emitter.on(message, payload => {
    ui.info(payload)
  })
}

const DummyCommand = {
  name: 'dummy',
  run() {
    const runner = createTaskRunner(this, DummyTask, dummyViewBuilder)
    runner.run()
  }
} as Command

export function activate(cli: Registrar) {
  cli.addCommand(DummyCommand)
}
