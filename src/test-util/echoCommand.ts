import { CliCommand } from '../cli-command'

export const echoCommand: CliCommand = {
  name: 'echo',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true
  }],
  description: 'Echoing input arguments',
  async run(_args, argv) {
    this.ui.info(...argv)
    return argv
  }
}
