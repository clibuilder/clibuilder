import { CliRegistrar, Command } from '../index'

const DummyCommand = {
  name: 'dummy',
  run() { return }
} as Command

export function activate(cli: CliRegistrar) {
  cli.addCommand(DummyCommand)
}
