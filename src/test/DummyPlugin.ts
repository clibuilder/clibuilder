import { CliRegistrar, Command } from '../index'

export function activate(cli: CliRegistrar) {
  cli.addCommand(DummyCommand)
}

const DummyCommand = {
  name: 'dummy',
  run() { return }
} as Command
