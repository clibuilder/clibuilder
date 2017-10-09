import { CliRegistrar, Command, createTaskRunner, Task, ViewContext, EventEmitter2 } from '../index'

class DummyTask extends Task {
  run() {
    this.emitter.emit('dummy')
  }
}

function dummyViewBuilder(emitter: EventEmitter2, { ui }: ViewContext) {
  emitter.on('dummy', () => {
    ui.info('dummy!')
  })
}

const DummyCommand = {
  name: 'dummy',
  run() {
    const runner = createTaskRunner(this, DummyTask, dummyViewBuilder)
    runner.run()
  }
} as Command

export function activate(cli: CliRegistrar) {
  cli.addCommand(DummyCommand)
}
