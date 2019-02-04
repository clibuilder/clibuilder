import { CliCommand } from '../cli-command'

export const echoAllCommand: CliCommand = {
  name: 'echo-all',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true
  }],
  description: 'Echoing input arguments at all levels',
  run(_args, argv) {
    this.ui.debug(...argv)
    this.ui.error(...argv)
    this.ui.info(...argv)
    this.ui.warn(...argv)
  }
}
