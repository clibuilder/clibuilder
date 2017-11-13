import { Emitter, createEvent } from 'fsa-emitter'

import { Registrar, CliCommand, createTaskRunner, Task, ViewContext } from '../index'

const message = createEvent<string>('dummy')

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
} as CliCommand

export function activate(cli: Registrar) {
  cli.addCommand(DummyCommand)
}
