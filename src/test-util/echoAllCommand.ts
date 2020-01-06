import { createCommand } from '../cli'

export const echoAllCommand = createCommand({
  name: 'echo-all',
  description: 'Echoing input arguments at all ui levels',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true,
  }],
  run(_args, argv) {
    this.ui.debug(...argv)
    this.ui.error(...argv)
    this.ui.info(...argv)
    this.ui.warn(...argv)
  },
})
