import { CommandSpec } from '../Command'

export const echoCommand: CommandSpec = {
  name: 'echo',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true
  }],
  description: 'Echoing input arguments',
  run(_args, argv) {
    this.ui.info(...argv)
  }
}
