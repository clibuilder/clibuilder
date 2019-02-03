import { Registrar, CliCommand } from '../index'

// istanbul ignore file
const DummyCommand = {
  name: 'dummy',
  run() {
    this.ui.info('dummy')
  }
} as CliCommand

export function activate(cli: Registrar) {
  cli.addCommand(DummyCommand)
}
