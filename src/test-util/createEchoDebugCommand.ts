import { CliCommand } from '../CliCommand/CliCommand'

export function createEchoDebugCommand(): CliCommand {
  return {
    name: 'echo-debug',
    arguments: [{
      name: 'args',
      description: 'any argument(s)',
      multiple: true
    }],
    description: 'Echoing input arguments',
    run(_args, argv) {
      this.ui.debug(...argv)
    }
  }
}
