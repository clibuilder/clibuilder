import { ActivationContext, CliCommand } from '../index'

// istanbul ignore file
const DummyCommand = {
  name: 'dummy',
  run() {
    this.ui.info('dummy')
  },
} as CliCommand

export function activate(cli: ActivationContext) {
  cli.addCommand(DummyCommand)
}
